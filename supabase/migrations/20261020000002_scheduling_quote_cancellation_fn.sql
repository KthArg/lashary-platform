-- 20261020000002_scheduling_quote_cancellation_fn.sql
-- US-AGE-06 · feature scheduling — qué le pasaría a la clienta si cancelara esta cita (criterio 2):
-- antes de confirmar, la pantalla informa si se pierde el anticipo y cuánto. No escribe nada.
-- Usa la misma regla que la cancelación (`scheduling_evaluate_cancellation`), así lo que se muestra es
-- lo que después se registra; una prueba compara las dos. Misma identificación de la clienta (sesión) y
-- mismo error para una cita ajena, inexistente o que ya no se puede cancelar: no revela si existe.
-- Cumplimiento: DOM-002, DOM-012, SEC-001, SEC-002, SEC-005, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_quote_cancellation(p_appointment_id uuid)
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
      v_appointment.status, v_appointment.starts_at, v_appointment.deposit_required);
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

REVOKE ALL ON FUNCTION public.scheduling_quote_cancellation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_quote_cancellation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_quote_cancellation(uuid) TO authenticated;
