-- 20261101000002_scheduling_reschedule_quote_and_audit_use_service_name.sql
-- US-AGE-04 · feature scheduling — reauditoría (2026-10-31), hallazgo A1 residual: una cita de paquete
-- deja technique_name en NULL por diseño (20261030000001), y dos lectores de la pantalla de reagendar
-- (US-AGE-10) no lo contemplaban todavía — el mismo criterio que 20261030000004 ya aplicó en la cola de
-- aprobación, "mis citas", la cancelación y el recordatorio de WhatsApp.
-- 1. scheduling_quote_reschedule devolvía v_appointment.technique_name sin más: coalesce(technique_name,
--    package_name), igual que scheduling_quote_cancellation.
-- 2. scheduling_reschedule_appointment guardaba technique_name tal cual en el payload de la bitácora
--    (insumo de US-NOT-02): mismo coalesce.
-- Cuerpos los de 20261027000011 y 20261027000007 con ese cambio. Mismas firmas: CREATE OR REPLACE
-- conserva los permisos.
-- Cumplimiento: ARCH-005, DOM-012, SEC-001, INT-008 (una migración, forward-only).

CREATE OR REPLACE FUNCTION public.scheduling_quote_reschedule(p_appointment_id uuid)
RETURNS TABLE (
  starts_at        timestamptz,
  ends_at          timestamptz,
  occupied_minutes integer,
  technique_name   text,
  status           text,
  reschedule_count integer,
  max_reschedules  integer,
  window_hours     integer,
  blocked_by       text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id   uuid;
  v_appointment public.scheduling_appointments;
  v_outcome     record;
  v_max         integer;
  v_blocked_by  text;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT * INTO v_appointment
    FROM public.scheduling_appointments a
   WHERE a.id = p_appointment_id
     AND a.client_id = v_client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_appointment_not_reschedulable';
  END IF;

  SELECT * INTO v_outcome
    FROM public.scheduling_evaluate_cancellation(
      COALESCE(v_appointment.previous_status, v_appointment.status),
      COALESCE(v_appointment.previous_starts_at, v_appointment.starts_at),
      v_appointment.deposit_registered);
  IF NOT v_outcome.cancellable THEN
    RAISE EXCEPTION 'scheduling_appointment_not_reschedulable';
  END IF;

  SELECT policy.max_reschedules INTO v_max FROM public.scheduling_reschedule_policy policy WHERE policy.singleton;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'scheduling_reschedule_policy_missing';
  END IF;

  v_blocked_by := CASE
    WHEN COALESCE(v_appointment.previous_status, v_appointment.status) IN ('approved', 'confirmed')
         AND NOT v_outcome.within_window THEN 'outside_window'
    WHEN v_appointment.reschedule_count >= v_max THEN 'limit_reached'
    ELSE NULL
  END;

  RETURN QUERY SELECT
    v_appointment.starts_at,
    v_appointment.ends_at,
    (extract(epoch FROM (upper(v_appointment.occupied_range) - v_appointment.starts_at)) / 60)::integer,
    coalesce(v_appointment.technique_name, v_appointment.package_name),
    v_appointment.status,
    v_appointment.reschedule_count,
    v_max,
    v_outcome.window_hours,
    v_blocked_by;
END;
$$;

CREATE OR REPLACE FUNCTION public.scheduling_reschedule_appointment(
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
  v_window_status  text;
  v_window_starts  timestamptz;
  v_holds          boolean;
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

  v_window_status := COALESCE(v_appointment.previous_status, v_appointment.status);
  v_window_starts := COALESCE(v_appointment.previous_starts_at, v_appointment.starts_at);
  v_holds := v_window_status IN ('approved', 'confirmed');

  SELECT * INTO v_outcome
    FROM public.scheduling_evaluate_cancellation(
      v_window_status, v_window_starts, v_appointment.deposit_registered);
  IF NOT v_outcome.cancellable THEN
    RAISE EXCEPTION 'scheduling_appointment_not_reschedulable';
  END IF;

  IF v_holds AND NOT v_outcome.within_window THEN
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
          AND other.blocked_ranges && v_new_range
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
           reschedule_count  = v_appointment.reschedule_count + 1,
           previous_starts_at      = CASE WHEN v_holds THEN v_window_starts END,
           previous_ends_at        = CASE WHEN v_holds
                                          THEN COALESCE(v_appointment.previous_ends_at, v_appointment.ends_at) END,
           previous_occupied_range = CASE WHEN v_holds
                                          THEN COALESCE(v_appointment.previous_occupied_range, v_appointment.occupied_range) END,
           previous_status         = CASE WHEN v_holds THEN v_window_status END
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
      'techniqueName',      coalesce(v_appointment.technique_name, v_appointment.package_name),
      'depositRegistered',  v_appointment.deposit_registered,
      'rescheduleCount',    v_appointment.reschedule_count + 1,
      'maxReschedules',     v_max,
      'heldStartsAt',       CASE WHEN v_holds THEN v_window_starts END
    )
  );

  RETURN QUERY
    SELECT v_appointment.id, p_new_starts_at, v_new_ends_at, 'pending_approval'::text,
           v_appointment.reschedule_count + 1;
END;
$$;
