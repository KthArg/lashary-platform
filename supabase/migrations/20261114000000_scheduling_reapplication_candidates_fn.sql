CREATE FUNCTION public.scheduling_reapplication_candidates()
RETURNS TABLE (client_id uuid, technique_id uuid, last_completed_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ON (a.client_id, a.delivered_technique_id)
         a.client_id,
         a.delivered_technique_id AS technique_id,
         a.ends_at AS last_completed_at
    FROM public.scheduling_appointments a
   WHERE a.status = 'completed'
     AND a.client_id IS NOT NULL
     AND a.delivered_technique_id IS NOT NULL
     AND NOT EXISTS (
           SELECT 1
             FROM public.scheduling_appointments f
            WHERE f.client_id = a.client_id
              AND f.status IN ('pending_approval', 'approved', 'confirmed')
              AND f.starts_at > now()
         )
   ORDER BY a.client_id, a.delivered_technique_id, a.ends_at DESC;
$$;

REVOKE ALL ON FUNCTION public.scheduling_reapplication_candidates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_reapplication_candidates() FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_reapplication_candidates() TO authenticated;
