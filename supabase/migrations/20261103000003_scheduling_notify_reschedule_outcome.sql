CREATE FUNCTION public.scheduling_notify_reschedule_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id    uuid;
  v_service_name text;
BEGIN
  SELECT a.client_id, coalesce(a.technique_name, a.package_name) INTO v_client_id, v_service_name
    FROM public.scheduling_appointments a
   WHERE a.id = NEW.entity_id;
  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM public.notifications_record_reschedule_outcome(
    NEW.id,
    CASE NEW.action
      WHEN 'scheduling.appointment.reschedule_reverted' THEN 'reschedule_rejected'
      ELSE 'reschedule_expired'
    END,
    NEW.entity_id,
    v_client_id,
    coalesce(nullif(btrim(v_service_name), ''), 'Servicio'),
    coalesce((NEW.payload ->> 'rejectedStartsAt')::timestamptz, (NEW.payload ->> 'expiredStartsAt')::timestamptz),
    (NEW.payload ->> 'restoredStartsAt')::timestamptz
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'scheduling_notify_reschedule_outcome: no se registró el aviso del evento % (%): %', NEW.id, NEW.action, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_notify_reschedule_outcome() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_events_notify_reschedule_outcome
  AFTER INSERT ON public.audit_events
  FOR EACH ROW
  WHEN (NEW.entity_type = 'scheduling_appointment'
        AND NEW.action IN ('scheduling.appointment.reschedule_reverted', 'scheduling.appointment.reschedule_expired'))
  EXECUTE FUNCTION public.scheduling_notify_reschedule_outcome();
