-- 20261019000005_scheduling_alerts.sql
-- US-AGE-05 · feature scheduling — alerta cuando el constraint de no-solape rechaza una reserva
-- (criterio 5 de US-AGE-09, trasladado a esta historia; ADR-0002).
-- Con el lock por recurso, dos reservas simultáneas se ordenan y la segunda recibe «espacio
-- ocupado» antes de llegar al constraint. Si el constraint igual rechaza, algo ocupó el espacio sin
-- pasar por el lock: es un error nuestro y no una carrera perdida, así que merece una alerta.
-- La bitácora de `audit` no sirve aquí: solo staff puede escribir en ella, y esta alerta nace en la
-- petición de una clienta (sin llave de servicio, SEC-003). La escribe la propia función de
-- reserva, que corre con los permisos del dueño, en una tabla de esta feature; nadie más puede
-- insertar, así que una clienta no puede falsear alertas llamando una función aparte.
-- El rechazo se atrapa dentro de la función y devuelve NULL en vez de relanzar: relanzar desharía
-- también la alerta. El repositorio lo lee como espacio no disponible.
-- Cumplimiento: ARCH-006, DOM-003, DOM-010, SEC-001, SEC-002, PERF-003, INT-008 (una migración,
--   forward-only).

CREATE TABLE public.scheduling_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('appointment_overlap_rejected')),
  resource_id     uuid NOT NULL REFERENCES public.scheduling_resources (id) ON DELETE RESTRICT,
  client_id       uuid,
  requested_from  timestamptz NOT NULL,
  requested_until timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scheduling_alerts_range_valid CHECK (requested_from < requested_until)
);

CREATE INDEX idx_scheduling_alerts_resource ON public.scheduling_alerts (resource_id);
CREATE INDEX idx_scheduling_alerts_created_at ON public.scheduling_alerts (created_at DESC);

ALTER TABLE public.scheduling_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_alerts_select_staff"
  ON public.scheduling_alerts
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

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
      client_id, technique_id, technique_name, is_first_time,
      service_price, deposit_required
    )
    VALUES (
      p_resource_id, p_starts_at, v_ends_at, tstzrange(p_starts_at, v_occupied_until),
      v_client_id, v_terms.technique_id, v_terms.name, p_is_first_time,
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
