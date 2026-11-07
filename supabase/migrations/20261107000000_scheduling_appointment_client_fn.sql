CREATE FUNCTION public.scheduling_appointment_client(p_appointment_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT a.client_id
    FROM public.scheduling_appointments a
   WHERE a.id = p_appointment_id;
$$;

REVOKE ALL ON FUNCTION public.scheduling_appointment_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_appointment_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_appointment_client(uuid) TO authenticated;
