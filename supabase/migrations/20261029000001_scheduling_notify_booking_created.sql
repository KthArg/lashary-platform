CREATE FUNCTION public.scheduling_notify_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_name  text;
  v_service_name text;
BEGIN
  SELECT names.full_name INTO v_client_name
    FROM public.clients_display_names(ARRAY[NEW.client_id]) AS names;
  v_service_name := coalesce(NEW.technique_name, to_jsonb(NEW) ->> 'package_name');

  PERFORM public.notifications_record_booking(
    NEW.id,
    coalesce(nullif(btrim(v_client_name), ''), 'Clienta'),
    coalesce(nullif(btrim(v_service_name), ''), 'Servicio'),
    NEW.starts_at
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'scheduling_notify_booking_created: no se registró el aviso de la cita %: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_notify_booking_created() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER scheduling_appointments_notify_booking_created
  AFTER INSERT ON public.scheduling_appointments
  FOR EACH ROW
  WHEN (NEW.client_id IS NOT NULL AND NEW.status = 'pending_approval')
  EXECUTE FUNCTION public.scheduling_notify_booking_created();
