CREATE FUNCTION public.scheduling_client_last_appointments()
RETURNS TABLE (client_id uuid, last_appointment_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT a.client_id, max(a.starts_at)
    FROM public.scheduling_appointments a
   WHERE a.client_id IS NOT NULL
   GROUP BY a.client_id;
$$;

REVOKE ALL ON FUNCTION public.scheduling_client_last_appointments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_client_last_appointments() FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_client_last_appointments() TO authenticated;

DROP FUNCTION public.clients_list(text, date, date);

CREATE FUNCTION public.clients_list(
  p_name_pattern     text,
  p_appointment_from date,
  p_appointment_to   date,
  p_delinquency      text
)
RETURNS TABLE (
  id                  uuid,
  full_name           text,
  phone               text,
  email               text,
  notes               text,
  created_at          timestamptz,
  last_appointment_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_delinquency IS NOT NULL AND p_delinquency NOT IN ('active', 'pending_review', 'none') THEN
    RAISE EXCEPTION 'clients_list_invalid_delinquency' USING ERRCODE = '22023';
  END IF;

  IF p_delinquency IS NULL THEN
    RETURN QUERY
    SELECT c.id, c.full_name, c.phone, c.email, c.notes, c.created_at, latest.last_appointment_at
      FROM public.clients_profiles c
      LEFT JOIN public.scheduling_client_last_appointments() latest ON latest.client_id = c.id
     WHERE (p_name_pattern IS NULL OR c.full_name ILIKE p_name_pattern)
       AND (p_appointment_from IS NULL
            OR (latest.last_appointment_at AT TIME ZONE 'America/Costa_Rica')::date >= p_appointment_from)
       AND (p_appointment_to IS NULL
            OR (latest.last_appointment_at AT TIME ZONE 'America/Costa_Rica')::date <= p_appointment_to);
  ELSE
    RETURN QUERY
    SELECT c.id, c.full_name, c.phone, c.email, c.notes, c.created_at, latest.last_appointment_at
      FROM public.clients_profiles c
      LEFT JOIN public.scheduling_client_last_appointments() latest ON latest.client_id = c.id
      LEFT JOIN public.delinquency_all_client_states() delinquent ON delinquent.client_id = c.id
     WHERE (p_name_pattern IS NULL OR c.full_name ILIKE p_name_pattern)
       AND (p_appointment_from IS NULL
            OR (latest.last_appointment_at AT TIME ZONE 'America/Costa_Rica')::date >= p_appointment_from)
       AND (p_appointment_to IS NULL
            OR (latest.last_appointment_at AT TIME ZONE 'America/Costa_Rica')::date <= p_appointment_to)
       AND (CASE WHEN p_delinquency = 'none'
                 THEN delinquent.client_id IS NULL
                 ELSE delinquent.state = p_delinquency
            END);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.clients_list(text, date, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clients_list(text, date, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clients_list(text, date, date, text) TO authenticated;
