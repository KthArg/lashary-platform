REVOKE SELECT ON public.notifications_client_notices FROM authenticated;
GRANT SELECT (id, kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at, status, created_at)
  ON public.notifications_client_notices TO authenticated;

CREATE OR REPLACE FUNCTION public.notifications_claim_client_notices(
  p_now               timestamptz,
  p_batch_size        integer,
  p_claim_ttl_minutes integer
)
RETURNS SETOF public.notifications_client_notices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (SELECT public.auth_is_staff()) THEN
    RAISE EXCEPTION 'notifications_claim_client_notices: solo el personal puede reclamar avisos' USING ERRCODE = '42501';
  END IF;
  IF p_batch_size IS NULL OR p_batch_size <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_client_notices: p_batch_size debe ser un entero positivo (llegó %)', p_batch_size;
  END IF;
  IF p_claim_ttl_minutes IS NULL OR p_claim_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_client_notices: p_claim_ttl_minutes debe ser un entero positivo (llegó %)', p_claim_ttl_minutes;
  END IF;

  RETURN QUERY
  WITH due AS MATERIALIZED (
    SELECT n.id FROM public.notifications_client_notices n
    WHERE (n.status = 'pending'
           OR (n.status = 'claimed' AND n.claimed_at < p_now - make_interval(mins => p_claim_ttl_minutes)))
      AND n.kept_starts_at > p_now
      AND EXISTS (
        SELECT 1 FROM public.scheduling_appointments a
        WHERE a.id = n.appointment_id
          AND a.status IN ('approved', 'confirmed')
          AND a.starts_at = n.kept_starts_at
      )
    ORDER BY n.created_at
    LIMIT p_batch_size
    FOR UPDATE OF n SKIP LOCKED
  )
  UPDATE public.notifications_client_notices AS notice
  SET status = 'claimed', claimed_at = p_now
  FROM due
  WHERE notice.id = due.id
  RETURNING notice.*;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_claim_client_notices(timestamptz, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifications_claim_client_notices(timestamptz, integer, integer) TO authenticated;
