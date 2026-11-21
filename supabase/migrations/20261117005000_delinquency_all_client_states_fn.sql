CREATE FUNCTION public.delinquency_all_client_states()
RETURNS TABLE (client_id uuid, state text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.client_id,
         CASE WHEN bool_or(c.state = 'active') THEN 'active' ELSE 'pending_review' END
    FROM public.delinquency_cases c
   WHERE c.state IN ('active', 'pending_review')
   GROUP BY c.client_id;
$$;

REVOKE ALL ON FUNCTION public.delinquency_all_client_states() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_all_client_states() FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_all_client_states() TO authenticated;
