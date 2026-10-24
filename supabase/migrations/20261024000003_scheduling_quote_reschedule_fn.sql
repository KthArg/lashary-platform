-- 20261024000003_scheduling_quote_reschedule_fn.sql
-- US-AGE-10 · feature scheduling — qué ve la clienta antes de elegir un horario para reagendar: la cita,
-- cuánto espacio ocupa (con la limpieza, para calcular los espacios del calendario), cuántas veces
-- se puede reagendar todavía y, si no se puede, por qué. No escribe nada.
-- Usa las mismas reglas que `scheduling_reschedule_appointment` y en el mismo orden (ventana y luego
-- tope), así la pantalla no ofrece un calendario que la función después rechazaría. Misma
-- identificación de la clienta (sesión) y mismo error para una cita ajena, inexistente o que ya no se
-- puede reagendar: no revela si existe.
-- `blocked_by` es `outside_window` (una cita aprobada o confirmada con menos horas que la ventana de
-- cancelación), `limit_reached` (ya se reagendó el máximo) o NULL (se puede).
-- Cumplimiento: DOM-002, SEC-001, SEC-002, SEC-005, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_quote_reschedule(p_appointment_id uuid)
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
      v_appointment.status, v_appointment.starts_at, v_appointment.deposit_registered);
  IF NOT v_outcome.cancellable THEN
    RAISE EXCEPTION 'scheduling_appointment_not_reschedulable';
  END IF;

  SELECT policy.max_reschedules INTO v_max FROM public.scheduling_reschedule_policy policy WHERE policy.singleton;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'scheduling_reschedule_policy_missing';
  END IF;

  v_blocked_by := CASE
    WHEN v_appointment.status IN ('approved', 'confirmed') AND NOT v_outcome.within_window THEN 'outside_window'
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

REVOKE ALL ON FUNCTION public.scheduling_quote_reschedule(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_quote_reschedule(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_quote_reschedule(uuid) TO authenticated;
