-- 20261027000011_scheduling_cancel_and_quotes_use_held_schedule.sql
-- US-AGE-10 · feature scheduling — hallazgo A2 y revisión de seguridad: con un reagendado esperando
-- decisión, el compromiso vigente es el horario aprobado que la cita guarda (20261027000006). Medir la
-- ventana contra el horario nuevo dejaba un hueco: una cita aprobada dentro de la ventana se reagendaba
-- lejos (sin perder nada) y luego se cancelaba sin perder el anticipo, porque la ventana miraba el
-- horario nuevo y el estado pendiente. Propuesta del equipo, pendiente del PO.
-- 1. `scheduling_cancel_appointment`: la ventana y el anticipo que se pierde se calculan con el estado y
--    el inicio guardados, si los hay. Cancelar suelta los dos espacios (trigger de 20261027000008). El
--    evento `scheduling.appointment.cancelled` agrega `heldStartsAt`.
-- 2. `scheduling_quote_cancellation`: cotiza igual, así lo que la clienta ve es lo que se cobra.
-- 3. `scheduling_quote_reschedule`: el motivo `outside_window` sale del horario guardado, igual que en
--    `scheduling_reschedule_appointment` (20261027000007).
-- Sin horario guardado, las tres responden como antes. Los cuerpos son los de 20261022000001,
-- 20261022000000 y 20261027000003 con ese cambio. Mismas firmas: `CREATE OR REPLACE` conserva los permisos.
-- Cumplimiento: DOM-011, DOM-012, SEC-001, INT-003, INT-008 (una migración, forward-only).

CREATE OR REPLACE FUNCTION public.scheduling_cancel_appointment(
  p_appointment_id            uuid,
  p_expected_forfeited_deposit bigint
)
RETURNS TABLE (appointment_id uuid, within_window boolean, forfeited_deposit bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id   uuid;
  v_appointment public.scheduling_appointments;
  v_outcome     record;
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
    RAISE EXCEPTION 'scheduling_appointment_not_cancellable';
  END IF;

  SELECT * INTO v_outcome
    FROM public.scheduling_evaluate_cancellation(
      COALESCE(v_appointment.previous_status, v_appointment.status),
      COALESCE(v_appointment.previous_starts_at, v_appointment.starts_at),
      v_appointment.deposit_registered);
  IF NOT v_outcome.cancellable THEN
    RAISE EXCEPTION 'scheduling_appointment_not_cancellable';
  END IF;

  IF p_expected_forfeited_deposit IS DISTINCT FROM v_outcome.forfeited_deposit THEN
    RAISE EXCEPTION 'scheduling_cancellation_consequence_changed';
  END IF;

  UPDATE public.scheduling_appointments a
     SET status = 'cancelled'
   WHERE a.id = v_appointment.id;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'scheduling.appointment.cancelled',
    'scheduling_appointment',
    v_appointment.id,
    jsonb_build_object(
      'previousStatus',    v_appointment.status,
      'startsAt',          v_appointment.starts_at,
      'techniqueName',     v_appointment.technique_name,
      'withinWindow',      v_outcome.within_window,
      'windowHours',       v_outcome.window_hours,
      'depositRequired',   v_appointment.deposit_required,
      'depositRegistered', v_appointment.deposit_registered,
      'forfeitedDeposit',  v_outcome.forfeited_deposit,
      'heldStartsAt',      v_appointment.previous_starts_at
    )
  );

  RETURN QUERY SELECT v_appointment.id, v_outcome.within_window, v_outcome.forfeited_deposit;
END;
$$;

CREATE OR REPLACE FUNCTION public.scheduling_quote_cancellation(p_appointment_id uuid)
RETURNS TABLE (
  starts_at         timestamptz,
  technique_name    text,
  within_window     boolean,
  forfeited_deposit bigint,
  window_hours      integer
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
    RAISE EXCEPTION 'scheduling_appointment_not_cancellable';
  END IF;

  SELECT * INTO v_outcome
    FROM public.scheduling_evaluate_cancellation(
      COALESCE(v_appointment.previous_status, v_appointment.status),
      COALESCE(v_appointment.previous_starts_at, v_appointment.starts_at),
      v_appointment.deposit_registered);
  IF NOT v_outcome.cancellable THEN
    RAISE EXCEPTION 'scheduling_appointment_not_cancellable';
  END IF;

  RETURN QUERY SELECT
    v_appointment.starts_at,
    v_appointment.technique_name,
    v_outcome.within_window,
    v_outcome.forfeited_deposit,
    v_outcome.window_hours;
END;
$$;

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
    v_appointment.technique_name,
    v_appointment.status,
    v_appointment.reschedule_count,
    v_max,
    v_outcome.window_hours,
    v_blocked_by;
END;
$$;
