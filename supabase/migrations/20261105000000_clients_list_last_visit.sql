CREATE FUNCTION public.scheduling_client_last_visits()
RETURNS TABLE (client_id uuid, last_visit_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT a.client_id, max(a.starts_at)
    FROM public.scheduling_appointments a
   WHERE a.status = 'completed'
     AND a.client_id IS NOT NULL
   GROUP BY a.client_id;
$$;

REVOKE ALL ON FUNCTION public.scheduling_client_last_visits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_client_last_visits() FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_client_last_visits() TO authenticated;

CREATE FUNCTION public.clients_list(
  p_name_pattern text,
  p_visit_from   date,
  p_visit_to     date
)
RETURNS TABLE (
  id            uuid,
  full_name     text,
  phone         text,
  email         text,
  notes         text,
  created_at    timestamptz,
  last_visit_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.full_name, c.phone, c.email, c.notes, c.created_at, visit.last_visit_at
    FROM public.clients_profiles c
    LEFT JOIN public.scheduling_client_last_visits() visit ON visit.client_id = c.id
   WHERE (p_name_pattern IS NULL OR c.full_name ILIKE p_name_pattern)
     AND (p_visit_from IS NULL
          OR (visit.last_visit_at AT TIME ZONE 'America/Costa_Rica')::date >= p_visit_from)
     AND (p_visit_to IS NULL
          OR (visit.last_visit_at AT TIME ZONE 'America/Costa_Rica')::date <= p_visit_to);
$$;

REVOKE ALL ON FUNCTION public.clients_list(text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clients_list(text, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.clients_list(text, date, date) TO authenticated;
