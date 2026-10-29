CREATE FUNCTION public.scheduling_notify_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.notifications_record_booking(
    NEW.id,
    (SELECT names.full_name FROM public.clients_display_names(ARRAY[NEW.client_id]) AS names),
    NEW.technique_name,
    NEW.starts_at
  );
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_notify_booking_created() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER scheduling_appointments_notify_booking_created
  AFTER INSERT ON public.scheduling_appointments
  FOR EACH ROW
  WHEN (NEW.client_id IS NOT NULL AND NEW.status = 'pending_approval')
  EXECUTE FUNCTION public.scheduling_notify_booking_created();
