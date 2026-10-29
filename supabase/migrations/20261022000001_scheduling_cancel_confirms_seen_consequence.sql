-- 20261022000001_scheduling_cancel_confirms_seen_consequence.sql
-- US-AGE-06 · feature scheduling — corrección de la revisión (M1): el criterio 3 exige informar la
-- consecuencia ANTES de confirmar, y la confirmación quedaba abierta en la tarjeta mientras el servidor
-- volvía a evaluar la regla con la hora y el estado de ese momento. Si entre las dos llamadas la cita
-- cruzó el borde de la ventana, o la administradora la aprobó, la clienta veía «sin pérdida» y el
-- servidor registraba el anticipo como perdido.
-- `scheduling_cancel_appointment` recibe ahora el anticipo perdido que la clienta vio. Si lo que se
-- aplicaría ahora es otra cifra, no cancela (la cita queda intacta y no hay evento) y falla con
-- `scheduling_cancellation_consequence_changed`; la pantalla le muestra la nueva consecuencia y le pide
-- confirmar de nuevo. El parámetro es obligatorio: no hay forma de cancelar sin decir qué se vio.
-- Comparar el monto y no el texto: lo que importa a la clienta es cuánto pierde.
-- Cumplimiento: DOM-002, DOM-012, SEC-001, SEC-002, SEC-005, INT-003, INT-008 (una migración, forward-only).

DROP FUNCTION public.scheduling_cancel_appointment(uuid);

CREATE FUNCTION public.scheduling_cancel_appointment(
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
      v_appointment.status, v_appointment.starts_at, v_appointment.deposit_registered);
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
      'forfeitedDeposit',  v_outcome.forfeited_deposit
    )
  );

  RETURN QUERY SELECT v_appointment.id, v_outcome.within_window, v_outcome.forfeited_deposit;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_cancel_appointment(uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_cancel_appointment(uuid, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_cancel_appointment(uuid, bigint) TO authenticated;
