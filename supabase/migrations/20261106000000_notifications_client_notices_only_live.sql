CREATE FUNCTION public.notifications_discard_client_notices(p_appointment_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.notifications_client_notices WHERE appointment_id = p_appointment_id;
$$;

REVOKE ALL ON FUNCTION public.notifications_discard_client_notices(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.scheduling_discard_superseded_client_notices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.notifications_discard_client_notices(NEW.entity_id);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'scheduling_discard_superseded_client_notices: no se descartó el aviso de la cita % (evento %): %', NEW.entity_id, NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_discard_superseded_client_notices() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_events_discard_superseded_client_notices
  AFTER INSERT ON public.audit_events
  FOR EACH ROW
  WHEN (NEW.entity_type = 'scheduling_appointment'
        AND NEW.action IN ('scheduling.appointment.rescheduled', 'scheduling.appointment.cancelled'))
  EXECUTE FUNCTION public.scheduling_discard_superseded_client_notices();

CREATE OR REPLACE FUNCTION public.notifications_claim_client_notices(
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
