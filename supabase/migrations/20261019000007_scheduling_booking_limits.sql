-- 20261019000007_scheduling_booking_limits.sql
-- US-AGE-05 · feature scheduling — tope de citas pendientes de aprobación por clienta (hallazgo M3 de
-- la auditoría; pedido de Kenny). Cada cita pendiente ocupa su espacio hasta que la administradora
-- decide, así que sin tope una sola cuenta podría acaparar la agenda. Solo cuentan las pendientes
-- futuras: una cita aprobada, rechazada o cancelada ya no ocupa un lugar en la cola.
-- El tope vive en la base y no en TypeScript porque la clienta llama la función de reserva directo
-- por PostgREST (SEC-001): una constante de la aplicación solo frenaría la pantalla. Y vive en una
-- tabla de una sola fila, y no escrito en la función, para que la administradora lo cambie con un
-- UPDATE sin pasar por una migración: nadie sabe todavía el valor correcto. Arranca en 3.
-- La función toma un lock por clienta antes de contar, así dos reservas simultáneas de la misma
-- clienta no se saltan el tope; siempre se toma primero el de la clienta y luego el del recurso.
-- Cumplimiento: DOM-010, SEC-001, SEC-002, SEC-005, INT-008 (una migración, forward-only).

CREATE TABLE public.scheduling_booking_limits (
  singleton              boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  max_pending_per_client integer NOT NULL CHECK (max_pending_per_client >= 1)
);

INSERT INTO public.scheduling_booking_limits (singleton, max_pending_per_client) VALUES (true, 3);

ALTER TABLE public.scheduling_booking_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_booking_limits_select_staff"
  ON public.scheduling_booking_limits
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "scheduling_booking_limits_update_admin"
  ON public.scheduling_booking_limits
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

REVOKE ALL ON public.scheduling_booking_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.scheduling_booking_limits TO authenticated;
GRANT UPDATE (max_pending_per_client) ON public.scheduling_booking_limits TO authenticated;

CREATE OR REPLACE FUNCTION public.scheduling_book_appointment(
  p_resource_id   uuid,
  p_starts_at     timestamptz,
  p_technique_id  uuid,
  p_is_first_time boolean
)
RETURNS public.scheduling_appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_studio_zone       CONSTANT text    := 'America/Costa_Rica';
  c_slot_interval_min CONSTANT integer := 30;
  c_minutes_per_day   CONSTANT integer := 1440;

  v_client_id      uuid;
  v_detected_first_time boolean;
  v_pending_count  bigint;
  v_terms          record;
  v_ends_at        timestamptz;
  v_occupied_until timestamptz;
  v_local_start    timestamp;
  v_day            date;
  v_start_min      integer;
  v_end_min        integer;
  v_block_start    integer;
  v_created        public.scheduling_appointments;
BEGIN
  SELECT c.id INTO v_client_id
    FROM public.clients_profiles c
   WHERE c.user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT * INTO v_terms FROM public.catalog_booking_terms(p_technique_id, p_is_first_time);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_technique_not_available';
  END IF;

  v_detected_first_time := NOT EXISTS (
    SELECT 1 FROM public.scheduling_appointments h
     WHERE h.client_id = v_client_id
       AND h.technique_id = p_technique_id
       AND h.status = 'completed'
  );

  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_client:' || v_client_id::text, 0));

  SELECT count(*) INTO v_pending_count
    FROM public.scheduling_appointments pending
   WHERE pending.client_id = v_client_id
     AND pending.status = 'pending_approval'
     AND pending.starts_at > now();

  IF v_pending_count >= (SELECT limits.max_pending_per_client FROM public.scheduling_booking_limits limits) THEN
    RAISE EXCEPTION 'scheduling_too_many_pending';
  END IF;

  IF p_starts_at IS NULL OR p_resource_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  v_ends_at        := p_starts_at + make_interval(mins => v_terms.duration_min);
  v_occupied_until := v_ends_at + make_interval(mins => v_terms.buffer_min);

  v_local_start := p_starts_at AT TIME ZONE c_studio_zone;
  v_day         := v_local_start::date;
  v_start_min   := extract(hour FROM v_local_start)::integer * 60 + extract(minute FROM v_local_start)::integer;
  v_end_min     := v_start_min + v_terms.duration_min + v_terms.buffer_min;

  IF p_starts_at <= now()
     OR date_trunc('minute', v_local_start) <> v_local_start
     OR v_end_min > c_minutes_per_day
     OR NOT EXISTS (SELECT 1 FROM public.scheduling_resources r WHERE r.id = p_resource_id AND r.is_active)
  THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  SELECT lower(open_block) INTO v_block_start
    FROM unnest((
      SELECT range_agg(int4range(w.start_min, w.end_min))
        FROM public.scheduling_weekly_availability w
       WHERE w.resource_id = p_resource_id
         AND w.weekday = extract(isodow FROM v_day)::smallint
         AND NOT EXISTS (
           SELECT 1 FROM public.scheduling_closed_dates cd
            WHERE cd.resource_id = p_resource_id AND cd.closed_on = v_day
         )
    )) AS open_block
   WHERE open_block @> int4range(v_start_min, v_end_min);

  IF NOT FOUND OR (v_start_min - v_block_start) % c_slot_interval_min <> 0 THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || p_resource_id::text, 0));

  IF EXISTS (
       SELECT 1 FROM public.scheduling_appointments a
        WHERE a.resource_id = p_resource_id
          AND a.status IN ('pending_approval', 'approved', 'confirmed')
          AND a.occupied_range && tstzrange(p_starts_at, v_occupied_until)
     )
     OR EXISTS (
       SELECT 1 FROM public.scheduling_manual_blocks b
        WHERE b.resource_id = p_resource_id
          AND tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, v_occupied_until)
     )
  THEN
    RAISE EXCEPTION 'scheduling_slot_taken';
  END IF;

  BEGIN
    INSERT INTO public.scheduling_appointments (
      resource_id, starts_at, ends_at, occupied_range,
      client_id, technique_id, technique_name, is_first_time, is_first_time_detected,
      service_price, deposit_required
    )
    VALUES (
      p_resource_id, p_starts_at, v_ends_at, tstzrange(p_starts_at, v_occupied_until),
      v_client_id, v_terms.technique_id, v_terms.name, p_is_first_time, v_detected_first_time,
      v_terms.price, public.payments_deposit_due(v_client_id, v_terms.deposit)
    )
    RETURNING * INTO v_created;
  EXCEPTION WHEN exclusion_violation THEN
    INSERT INTO public.scheduling_alerts (kind, resource_id, client_id, requested_from, requested_until)
    VALUES ('appointment_overlap_rejected', p_resource_id, v_client_id, p_starts_at, v_occupied_until);
    RETURN NULL;
  END;

  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) TO authenticated;
