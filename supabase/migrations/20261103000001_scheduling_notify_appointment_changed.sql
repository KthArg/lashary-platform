CREATE FUNCTION public.scheduling_notify_appointment_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id    uuid;
  v_client_name  text;
  v_service_name text;
BEGIN
  SELECT a.client_id INTO v_client_id
    FROM public.scheduling_appointments a
   WHERE a.id = NEW.entity_id;
  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT names.full_name INTO v_client_name
    FROM public.clients_display_names(ARRAY[v_client_id]) AS names;
  v_client_name  := coalesce(nullif(btrim(v_client_name), ''), 'Clienta');
  v_service_name := coalesce(nullif(btrim(NEW.payload ->> 'techniqueName'), ''), 'Servicio');

  IF NEW.action = 'scheduling.appointment.cancelled' THEN
    PERFORM public.notifications_record_cancellation(
      NEW.id,
      NEW.entity_id,
      v_client_name,
      v_service_name,
      coalesce((NEW.payload ->> 'heldStartsAt')::timestamptz, (NEW.payload ->> 'startsAt')::timestamptz),
      coalesce((NEW.payload ->> 'forfeitedDeposit')::bigint, 0)
    );
  ELSE
    PERFORM public.notifications_record_reschedule(
      NEW.id,
      NEW.entity_id,
      v_client_name,
      v_service_name,
      (NEW.payload ->> 'previousStartsAt')::timestamptz,
      (NEW.payload ->> 'newStartsAt')::timestamptz
    );
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'scheduling_notify_appointment_changed: no se registró el aviso del evento % (%): %', NEW.id, NEW.action, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_notify_appointment_changed() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_events_notify_appointment_changed
  AFTER INSERT ON public.audit_events
  FOR EACH ROW
  WHEN (NEW.entity_type = 'scheduling_appointment'
        AND NEW.action IN ('scheduling.appointment.cancelled', 'scheduling.appointment.rescheduled'))
  EXECUTE FUNCTION public.scheduling_notify_appointment_changed();
