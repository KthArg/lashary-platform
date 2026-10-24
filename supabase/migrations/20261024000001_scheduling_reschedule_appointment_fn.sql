-- 20261024000001_scheduling_reschedule_appointment_fn.sql
-- US-AGE-10 · feature scheduling — la clienta mueve una cita suya a otro espacio (criterios 1 a 3 y 5).
-- Una sola función, `scheduling_reschedule_appointment`, hace todo en una transacción (DOM-011):
-- toma la cita con `FOR UPDATE`, valida, comprueba el espacio nuevo como una reserva y lo ocupa,
-- sube el contador y deja el evento `scheduling.appointment.rescheduled` en la bitácora. El espacio
-- viejo y el nuevo son la misma fila: no existe el instante en que la clienta no tiene ninguno.
-- Decisiones del PO del 2026-10-23 (docs/process/DEPENDENCIES.md):
-- 1. Una cita `approved` o `confirmed` solo se mueve con la antelación de la ventana de cancelación
--    (la regla es `scheduling_evaluate_cancellation`, la misma que usa cancelar); una `pending_approval`
--    se mueve sin ventana.
-- 2. Al reagendar, la cita vuelve a `pending_approval` y la administradora la decide de nuevo. El
--    anticipo registrado, el precio y la duración quedan como estaban (DOM-002): la función no los toca.
--    Quien decidió antes se borra de la fila (`decided_by`, `decided_at`, `decision_reason`); el estado
--    anterior queda en el evento (`previousStatus`).
-- 3. Tope de reagendados por cita: `scheduling_reschedule_policy` y `reschedule_count` (pieza anterior).
-- 4. El espacio nuevo pasa lo mismo que una reserva: hora futura, en la grilla de un bloque abierto, día
--    no cerrado, sin cruzar otra cita ni un bloqueo manual, y el límite de citas pendientes de la clienta
--    (una cita aprobada que vuelve a pendiente cuenta contra él).
-- 5. La clienta manda el estado que vio; si la cita ya cambió, no se mueve (misma lección que
--    `scheduling_cancel_appointment`: confirmar lo que la clienta vio).
-- Toma los mismos locks que `scheduling_book_appointment`, en el mismo orden (clienta y luego recurso),
-- así una reserva, un bloqueo manual y un reagendado del mismo recurso nunca corren a la vez.
-- La cita que se mueve no cuenta como choque consigo misma.
-- Cumplimiento: DOM-002, DOM-010, DOM-011, DOM-012, SEC-001, SEC-002, SEC-005, INT-003, INT-008
-- (una migración, forward-only).

CREATE FUNCTION public.scheduling_reschedule_appointment(
  p_appointment_id  uuid,
  p_new_starts_at   timestamptz,
  p_expected_status text
)
RETURNS TABLE (appointment_id uuid, starts_at timestamptz, ends_at timestamptz, status text, reschedule_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_studio_zone       CONSTANT text    := 'America/Costa_Rica';
  c_slot_interval_min CONSTANT integer := 30;
  c_minutes_per_day   CONSTANT integer := 1440;

  v_client_id      uuid;
  v_appointment    public.scheduling_appointments;
  v_outcome        record;
  v_max            integer;
  v_pending_count  bigint;
  v_duration       interval;
  v_before         interval;
  v_after          interval;
  v_new_ends_at    timestamptz;
  v_new_range      tstzrange;
  v_local_start    timestamp;
  v_day            date;
  v_start_min      integer;
  v_end_min        integer;
  v_block_start    integer;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT * INTO v_appointment
    FROM public.scheduling_appointments a
   WHERE a.id = p_appointment_id
     AND a.client_id = v_client_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_appointment_not_reschedulable';
  END IF;

  IF p_expected_status IS DISTINCT FROM v_appointment.status THEN
    RAISE EXCEPTION 'scheduling_reschedule_state_changed';
  END IF;

  SELECT * INTO v_outcome
    FROM public.scheduling_evaluate_cancellation(
      v_appointment.status, v_appointment.starts_at, v_appointment.deposit_registered);
  IF NOT v_outcome.cancellable THEN
    RAISE EXCEPTION 'scheduling_appointment_not_reschedulable';
  END IF;

  IF v_appointment.status IN ('approved', 'confirmed') AND NOT v_outcome.within_window THEN
    RAISE EXCEPTION 'scheduling_reschedule_outside_window';
  END IF;

  SELECT policy.max_reschedules INTO v_max FROM public.scheduling_reschedule_policy policy WHERE policy.singleton;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'scheduling_reschedule_policy_missing';
  END IF;
  IF v_appointment.reschedule_count >= v_max THEN
    RAISE EXCEPTION 'scheduling_reschedule_limit_reached';
  END IF;

  IF p_new_starts_at IS NULL OR p_new_starts_at = v_appointment.starts_at THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  v_duration    := v_appointment.ends_at - v_appointment.starts_at;
  v_before      := v_appointment.starts_at - lower(v_appointment.occupied_range);
  v_after       := upper(v_appointment.occupied_range) - v_appointment.ends_at;
  v_new_ends_at := p_new_starts_at + v_duration;
  v_new_range   := tstzrange(p_new_starts_at - v_before, v_new_ends_at + v_after);

  v_local_start := p_new_starts_at AT TIME ZONE c_studio_zone;
  v_day         := v_local_start::date;
  v_start_min   := extract(hour FROM v_local_start)::integer * 60 + extract(minute FROM v_local_start)::integer;
  v_end_min     := v_start_min + (extract(epoch FROM (v_duration + v_after)) / 60)::integer;

  IF p_new_starts_at <= now()
     OR date_trunc('minute', v_local_start) <> v_local_start
     OR v_end_min > c_minutes_per_day
     OR NOT EXISTS (
       SELECT 1 FROM public.scheduling_resources r WHERE r.id = v_appointment.resource_id AND r.is_active)
  THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  SELECT lower(open_block) INTO v_block_start
    FROM unnest((
      SELECT range_agg(int4range(w.start_min, w.end_min))
        FROM public.scheduling_weekly_availability w
       WHERE w.resource_id = v_appointment.resource_id
         AND w.weekday = extract(isodow FROM v_day)::smallint
         AND NOT EXISTS (
           SELECT 1 FROM public.scheduling_closed_dates cd
            WHERE cd.resource_id = v_appointment.resource_id AND cd.closed_on = v_day
         )
    )) AS open_block
   WHERE open_block @> int4range(v_start_min, v_end_min);

  IF NOT FOUND OR (v_start_min - v_block_start) % c_slot_interval_min <> 0 THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_client:' || v_client_id::text, 0));

  IF v_appointment.status <> 'pending_approval' THEN
    SELECT count(*) INTO v_pending_count
      FROM public.scheduling_appointments pending
     WHERE pending.client_id = v_client_id
       AND pending.status = 'pending_approval'
       AND pending.starts_at > now();

    IF v_pending_count >= (SELECT limits.max_pending_per_client FROM public.scheduling_booking_limits limits) THEN
      RAISE EXCEPTION 'scheduling_too_many_pending';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || v_appointment.resource_id::text, 0));

  IF EXISTS (
       SELECT 1 FROM public.scheduling_appointments other
        WHERE other.resource_id = v_appointment.resource_id
          AND other.id <> v_appointment.id
          AND other.status IN ('pending_approval', 'approved', 'confirmed')
          AND other.occupied_range && v_new_range
     )
     OR EXISTS (
       SELECT 1 FROM public.scheduling_manual_blocks b
        WHERE b.resource_id = v_appointment.resource_id
          AND tstzrange(b.starts_at, b.ends_at) && v_new_range
     )
  THEN
    RAISE EXCEPTION 'scheduling_slot_taken';
  END IF;

  BEGIN
    UPDATE public.scheduling_appointments a
       SET starts_at         = p_new_starts_at,
           ends_at           = v_new_ends_at,
           occupied_range    = v_new_range,
           status            = 'pending_approval',
           decided_by        = NULL,
           decided_at        = NULL,
           decision_reason   = NULL,
           reschedule_count  = v_appointment.reschedule_count + 1
     WHERE a.id = v_appointment.id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'scheduling_slot_taken';
  END;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'scheduling.appointment.rescheduled',
    'scheduling_appointment',
    v_appointment.id,
    jsonb_build_object(
      'previousStatus',     v_appointment.status,
      'previousStartsAt',   v_appointment.starts_at,
      'previousEndsAt',     v_appointment.ends_at,
      'newStartsAt',        p_new_starts_at,
      'newEndsAt',          v_new_ends_at,
      'techniqueName',      v_appointment.technique_name,
      'depositRegistered',  v_appointment.deposit_registered,
      'rescheduleCount',    v_appointment.reschedule_count + 1,
      'maxReschedules',     v_max
    )
  );

  RETURN QUERY
    SELECT v_appointment.id, p_new_starts_at, v_new_ends_at, 'pending_approval'::text,
           v_appointment.reschedule_count + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_reschedule_appointment(uuid, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_reschedule_appointment(uuid, timestamptz, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_reschedule_appointment(uuid, timestamptz, text) TO authenticated;
