-- 20261030000004_scheduling_package_display_name_fixes.sql
-- US-AGE-04 · feature scheduling — corrección de revisión de código: una cita de paquete deja
-- technique_name en NULL (forma válida, ver 20261030000001), y tres funciones que ya existían
-- antes de esta historia seguían leyendo solo esa columna: scheduling_list_my_appointments
-- («mis citas»), scheduling_quote_cancellation y scheduling_cancel_appointment (bitácora, payload
-- para US-NOT-02). Las tres coalescen ahora con package_name, igual que ya hace
-- scheduling_notify_booking_created (US-NOT-01). No cambia ninguna firma ni el nombre de salida
-- technique_name: pasa a significar «el nombre que se muestra», técnica o paquete — si debería ser
-- neutral (serviceName) en todos los tipos que lo usan es una decisión de naming pendiente,
-- registrada en docs/process/DEPENDENCIES.md. `clients` no necesitó cambios: history-gateways.ts
-- ya renombra el campo a serviceName sin asumir que viniera de una técnica.
--
-- Rebasada sobre US-AGE-10 (#632, en main): las tres ya traían el cambio de esa historia (horario
-- guardado) — scheduling_list_my_appointments cambió de firma (DROP+CREATE, agrega
-- held_starts_at/held_ends_at) y las otras dos evalúan contra el estado/inicio guardados. Único
-- cambio de esta migración: coalesce(technique_name, package_name).
-- Cumplimiento: DOM-002, SEC-001, SEC-005, INT-008 (una migración, forward-only).

DROP FUNCTION public.scheduling_list_my_appointments(timestamptz, integer);

CREATE FUNCTION public.scheduling_list_my_appointments(p_now timestamptz, p_limit integer)
RETURNS TABLE (
  id               uuid,
  starts_at        timestamptz,
  ends_at          timestamptz,
  technique_name   text,
  status           text,
  is_first_time    boolean,
  service_price    bigint,
  deposit_required bigint,
  held_starts_at   timestamptz,
  held_ends_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.starts_at, a.ends_at, coalesce(a.technique_name, a.package_name), a.status,
         a.is_first_time, a.service_price, a.deposit_required,
         a.previous_starts_at, a.previous_ends_at
    FROM public.scheduling_appointments a
   WHERE a.client_id = public.clients_current_profile_id()
     AND a.status IN ('pending_approval', 'approved', 'confirmed')
     AND a.starts_at > p_now
   ORDER BY a.starts_at ASC
   LIMIT greatest(least(coalesce(p_limit, 50), 100), 0);
$$;

REVOKE ALL ON FUNCTION public.scheduling_list_my_appointments(timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_list_my_appointments(timestamptz, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_list_my_appointments(timestamptz, integer) TO authenticated;

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
    coalesce(v_appointment.technique_name, v_appointment.package_name),
    v_outcome.within_window,
    v_outcome.forfeited_deposit,
    v_outcome.window_hours;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_quote_cancellation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_quote_cancellation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_quote_cancellation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.scheduling_cancel_appointment(
  p_appointment_id             uuid,
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
      'techniqueName',     coalesce(v_appointment.technique_name, v_appointment.package_name),
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

REVOKE ALL ON FUNCTION public.scheduling_cancel_appointment(uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_cancel_appointment(uuid, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_cancel_appointment(uuid, bigint) TO authenticated;
