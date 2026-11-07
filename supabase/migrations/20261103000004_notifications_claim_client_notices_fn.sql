CREATE FUNCTION public.notifications_claim_client_notices(
  p_now               timestamptz,
  p_batch_size        integer,
  p_claim_ttl_minutes integer
)
RETURNS SETOF public.notifications_client_notices
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_batch_size IS NULL OR p_batch_size <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_client_notices: p_batch_size debe ser un entero positivo (llegó %)', p_batch_size;
  END IF;
  IF p_claim_ttl_minutes IS NULL OR p_claim_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_client_notices: p_claim_ttl_minutes debe ser un entero positivo (llegó %)', p_claim_ttl_minutes;
  END IF;

  RETURN QUERY
  WITH due AS MATERIALIZED (
    SELECT id FROM public.notifications_client_notices
    WHERE status = 'pending'
       OR (status = 'claimed' AND claimed_at < p_now - make_interval(mins => p_claim_ttl_minutes))
    ORDER BY created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
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
