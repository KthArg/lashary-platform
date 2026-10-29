-- 20261026000001_notifications_claim_due_reminders_fn.sql
-- US-NOT-03 · feature notifications — reclamo atómico de recordatorios en dos funciones:
--
-- notifications_claim_due_reminders: pending vencido por send_at -> claimed, en tandas de
-- p_batch_size (positivo; NULL o <= 0 lanza). FOR UPDATE SKIP LOCKED: dos corridas superpuestas
-- del cron se reparten las filas sin reclamar la misma dos veces (DOM-010).
--
-- notifications_release_expired_claims: claimed con más de p_claim_ttl_minutes -> pending, para que
-- reconcileReminders la revalide en la misma corrida antes de enviarla.
--
-- p_now viene de shared/clock.ts (DOM-004), así las pruebas controlan el tiempo.
-- SECURITY INVOKER: el cron entra autenticado como staff (SEC-003) y la política de UPDATE de
-- notifications_reminders ya se lo permite vía auth_is_staff(). EXECUTE solo para authenticated.
-- Cumplimiento: ARCH-006, SEC-001/003/004, PERF-003 (índice (status, send_at)), INT-008.

CREATE FUNCTION public.notifications_claim_due_reminders(
  p_now        timestamptz,
  p_batch_size integer
)
RETURNS SETOF public.notifications_reminders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_batch_size IS NULL OR p_batch_size <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_due_reminders: p_batch_size debe ser un entero positivo (llegó %)', p_batch_size;
  END IF;

  RETURN QUERY
  UPDATE public.notifications_reminders
  SET status = 'claimed', claimed_at = p_now
  WHERE id IN (
    SELECT id FROM public.notifications_reminders
    WHERE status = 'pending' AND send_at <= p_now
    ORDER BY send_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_claim_due_reminders(timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notifications_claim_due_reminders(timestamptz, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.notifications_claim_due_reminders(timestamptz, integer) TO authenticated;

CREATE FUNCTION public.notifications_release_expired_claims(
  p_now               timestamptz,
  p_claim_ttl_minutes integer
)
RETURNS SETOF public.notifications_reminders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_claim_ttl_minutes IS NULL OR p_claim_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'notifications_release_expired_claims: p_claim_ttl_minutes debe ser un entero positivo (llegó %)', p_claim_ttl_minutes;
  END IF;

  RETURN QUERY
  UPDATE public.notifications_reminders
  SET status = 'pending', claimed_at = NULL
  WHERE id IN (
    SELECT id FROM public.notifications_reminders
    WHERE status = 'claimed' AND claimed_at < p_now - make_interval(mins => p_claim_ttl_minutes)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_release_expired_claims(timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notifications_release_expired_claims(timestamptz, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.notifications_release_expired_claims(timestamptz, integer) TO authenticated;
