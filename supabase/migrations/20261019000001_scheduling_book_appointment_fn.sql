-- 20261019000001_scheduling_book_appointment_fn.sql
-- US-AGE-05 · feature scheduling — la reserva de la clienta, calculada y validada por la base.
-- La clienta puede llamar esta función directo por PostgREST, así que nada de lo que se congela en
-- la cita llega como parámetro suyo: la clienta sale de la sesión (SEC-005), y la técnica, el precio,
-- el anticipo y la duración salen de los contratos de catalog y payments (ARCH-005, DOM-002). Solo
-- recibe qué técnica, si es primera vez y a qué hora.
-- Antes de insertar valida lo mismo que ofrece el calendario (US-AGE-02): el horario cae dentro de
-- un bloque abierto, el día no está cerrado, el inicio está en la grilla de 30 minutos que parte de
-- ese bloque y no es pasado. Con el lock por recurso tomado, revisa que nadie más ocupe el espacio;
-- el exclusion constraint sigue siendo la garantía (DOM-010), así que si dispara es un error nuestro
-- y no una carrera perdida: las carreras las ordena el lock.
-- Errores: RAISE con un código en el mensaje, que el repositorio mapea a errores tipados.
--   scheduling_client_not_registered  la sesión no es de una clienta con perfil
--   scheduling_technique_not_available técnica inexistente, desactivada o sin retoque
--   scheduling_slot_not_offered       el calendario no ofrece ese horario (pasado, fuera de horario,
--                                     día cerrado, fuera de la grilla, recurso inactivo)
--   scheduling_slot_taken             el espacio lo ocupa una cita o un bloqueo
-- Repite el 30 de SLOT_INTERVAL_MIN y la zona del estudio (shared/studio-time.ts), como
-- scheduling_busy_ranges: si cambian, cambian aquí.
-- Cumplimiento: ARCH-005, DOM-002, DOM-010, SEC-001, SEC-005, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_book_appointment(
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

  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) TO authenticated;
