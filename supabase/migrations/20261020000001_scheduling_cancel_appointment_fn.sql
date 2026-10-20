-- 20261020000001_scheduling_cancel_appointment_fn.sql
-- US-AGE-06 · feature scheduling — la clienta cancela su cita (criterios 3, 4 y 6).
-- La clienta llama la función directo por PostgREST, así que la clienta sale de la sesión y la regla
-- de la ventana se decide aquí y no en la pantalla (SEC-001, SEC-005). Cancelar y dejar el evento en
-- la bitácora son una sola transacción: si la bitácora falla, la cita no se cancela. La bitácora solo
-- admite INSERT de staff por RLS; la función corre con los permisos del dueño y es el único camino
-- por el que una cancelación de clienta escribe ahí.
-- «Se pierde el anticipo» es solo un registro en el evento, con el monto congelado de la cita (decisión
-- aprobada en la conversación de trabajo; DOM-012 pendiente de la aprobación del PO): no mueve dinero.
-- El evento `scheduling.appointment.cancelled` lo consumirá US-NOT-02 para avisar a la administradora.
-- Cancelar saca la cita del constraint de no-solape y libera el espacio al instante (DOM-010).
-- El trigger de decisión sellaba quién y cuándo en CUALQUIER cambio de estado; ahora solo en aprobar o
-- rechazar, para que cancelar no pise quién aprobó la cita.
-- La regla de la ventana vive en un solo lugar (`scheduling_evaluate_cancellation`), que usarán esta
-- función y la consulta previa a confirmar; ningún rol de la API la ejecuta porque lee la política.
-- Cumplimiento: DOM-002, DOM-010, DOM-012, SEC-001, SEC-002, SEC-005, INT-003, INT-008 (una migración).

DROP TRIGGER scheduling_appointments_stamp_decision ON public.scheduling_appointments;

CREATE TRIGGER scheduling_appointments_stamp_decision
  BEFORE UPDATE OF status ON public.scheduling_appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION public.scheduling_stamp_decision();

CREATE FUNCTION public.scheduling_evaluate_cancellation(
  p_status           text,
  p_starts_at        timestamptz,
  p_deposit_required bigint
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
           THEN coalesce(p_deposit_required, 0)
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

CREATE FUNCTION public.scheduling_cancel_appointment(p_appointment_id uuid)
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
      v_appointment.status, v_appointment.starts_at, v_appointment.deposit_required);
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
      'previousStatus',   v_appointment.status,
      'startsAt',         v_appointment.starts_at,
      'techniqueName',    v_appointment.technique_name,
      'withinWindow',     v_outcome.within_window,
      'windowHours',      v_outcome.window_hours,
      'depositRequired',  v_appointment.deposit_required,
      'forfeitedDeposit', v_outcome.forfeited_deposit
    )
  );

  RETURN QUERY SELECT v_appointment.id, v_outcome.within_window, v_outcome.forfeited_deposit;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_cancel_appointment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_cancel_appointment(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_cancel_appointment(uuid) TO authenticated;
