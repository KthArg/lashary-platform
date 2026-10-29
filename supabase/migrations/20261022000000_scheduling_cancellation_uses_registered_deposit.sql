-- 20261022000000_scheduling_cancellation_uses_registered_deposit.sql
-- US-AGE-06 · feature scheduling — corrección de la revisión: el anticipo que se pierde al cancelar es
-- el REGISTRADO (`deposit_registered`, lo que el estudio confirmó que la clienta pagó), no el requerido.
-- Una clienta que no pagó todo el anticipo, o que la administradora exoneró o dejó pagar menos, no puede
-- leer «perdés ₡10 000» si lo registrado es otra cifra: sería mentira. La cita ya congela las dos cifras.
-- Cambia la regla suelta (`scheduling_evaluate_cancellation`, que recibe ahora el anticipo registrado)
-- y las dos funciones que la usan, con el mismo contrato de entrada y de salida. El evento de bitácora
-- conserva `depositRequired` y agrega `depositRegistered`. Las migraciones anteriores no se tocan.
-- Cumplimiento: DOM-002, DOM-012, SEC-001, SEC-002, SEC-005, INT-003, INT-008 (una migración, forward-only).

DROP FUNCTION public.scheduling_evaluate_cancellation(text, timestamptz, bigint);

CREATE FUNCTION public.scheduling_evaluate_cancellation(
  p_status             text,
  p_starts_at          timestamptz,
  p_deposit_registered bigint
)
RETURNS TABLE (cancellable boolean, within_window boolean, forfeited_deposit bigint, window_hours integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT evaluated.cancellable,
         evaluated.within_window,
         CASE
           WHEN evaluated.cancellable AND NOT evaluated.within_window
                AND p_status IN ('approved', 'confirmed')
           THEN coalesce(p_deposit_registered, 0)
           ELSE 0
         END,
         evaluated.window_hours
    FROM (
      SELECT policy.cancellation_window_hours AS window_hours,
             (p_status IN ('pending_approval', 'approved', 'confirmed') AND p_starts_at > now()) AS cancellable,
             (p_starts_at - now() >= make_interval(hours => policy.cancellation_window_hours)) AS within_window
        FROM public.scheduling_cancellation_policy policy
    ) evaluated;
$$;

REVOKE ALL ON FUNCTION public.scheduling_evaluate_cancellation(text, timestamptz, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_evaluate_cancellation(text, timestamptz, bigint) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.scheduling_cancel_appointment(p_appointment_id uuid)
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
      v_appointment.status, v_appointment.starts_at, v_appointment.deposit_registered);
  IF NOT v_outcome.cancellable THEN
    RAISE EXCEPTION 'scheduling_appointment_not_cancellable';
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
      'forfeitedDeposit',  v_outcome.forfeited_deposit
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
      v_appointment.status, v_appointment.starts_at, v_appointment.deposit_registered);
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
