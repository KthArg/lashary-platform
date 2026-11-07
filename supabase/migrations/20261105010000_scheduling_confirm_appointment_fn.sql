-- 20261105010000_scheduling_confirm_appointment_fn.sql
-- US-NOT-08 · feature scheduling — criterios 2 y 5: la clienta confirma su cita aprobada, o la
-- administradora la registra si la clienta respondió por otro medio. Hasta aquí nada llevaba una cita a
-- `confirmed`. Es `SECURITY DEFINER`: la clienta no tiene UPDATE sobre sus citas y la política de staff
-- solo deja terminar en `approved` o `rejected`.
-- Quien no es dueña ni staff recibe el mismo error que con una cita inexistente (SEC-005). Confirmar dos
-- veces no falla ni repite el evento. La fecha, la hora y quién confirmó quedan en la bitácora, en la
-- misma transacción (INT-003). Devuelve la ventana de cancelación y el anticipo requerido para que la
-- clienta vea la política vigente (decisión del PO del 2026-11-05): confirmar no la cambia.
-- Cumplimiento: DOM-012, SEC-001, SEC-002, SEC-005, INT-003, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_confirm_appointment(p_appointment_id uuid)
RETURNS TABLE (appointment_id uuid, window_hours integer, deposit_required bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_staff    boolean := public.auth_is_staff();
  v_client_id   uuid    := public.clients_current_profile_id();
  v_appointment public.scheduling_appointments;
  v_window      integer;
BEGIN
  SELECT * INTO v_appointment
    FROM public.scheduling_appointments a
   WHERE a.id = p_appointment_id
     AND (v_is_staff OR a.client_id = v_client_id)
     FOR UPDATE;
  IF NOT FOUND
     OR v_appointment.status NOT IN ('approved', 'confirmed')
     OR v_appointment.starts_at <= now() THEN
    RAISE EXCEPTION 'scheduling_appointment_not_confirmable';
  END IF;

  IF v_appointment.status = 'approved' THEN
    UPDATE public.scheduling_appointments a
       SET status = 'confirmed'
     WHERE a.id = v_appointment.id;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.appointment.confirmed',
      'scheduling_appointment',
      v_appointment.id,
      jsonb_build_object(
        'startsAt',    v_appointment.starts_at,
        'serviceName', COALESCE(v_appointment.package_name, v_appointment.technique_name),
        'confirmedBy', CASE WHEN v_is_staff THEN 'staff' ELSE 'client' END
      )
    );
  END IF;

  SELECT policy.cancellation_window_hours INTO v_window
    FROM public.scheduling_cancellation_policy policy
   WHERE policy.singleton;

  RETURN QUERY SELECT v_appointment.id, v_window, v_appointment.deposit_required;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_confirm_appointment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_confirm_appointment(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_confirm_appointment(uuid) TO authenticated;
