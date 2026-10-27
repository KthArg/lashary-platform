-- 20261026000002_notifications_claim_split_ttl_and_lockdown.sql
-- US-NOT-03 · feature notifications — tercera revisión del líder (2026-10-26) sobre A2:
--
-- 1) notifications_claim_due_reminders no revocaba PUBLIC ni anon (las demás funciones del
--    repo sí lo hacen, p. ej. catalog_delete_package); un p_batch_size NULL volvía LIMIT NULL
--    (sin tope, reclama la tabla entera); y el TTL se armaba concatenando texto
--    (`p_claim_ttl_minutes || ' minutes'`) en vez de make_interval, frágil ante un valor no
--    numérico. Se corrige aquí y de paso se revoca/otorga igual que el resto del repo.
--
-- 2) Separación real del reclamo (hallazgo nuevo del líder): cuando una fila claimed volvía por
--    vencimiento de TTL, el ciclo la mandaba a enviar directo, sin pasar otra vez por
--    reconcileReminders — si la clienta había cancelado la cita o esta ya pasó mientras la fila
--    estuvo atascada en claimed, se reenviaba igual sin revisar. Ahora el reclamo se divide en
--    dos funciones: notifications_release_expired_claims (claimed vencido -> pending, se llama al
--    principio de reconcileReminders, antes de leer lo pendiente, para que la misma corrida la
--    revalide) y notifications_claim_due_reminders (ya sin TTL: solo pending vencido por send_at,
--    lo reclama send-due-reminders). Reemplaza a la versión de 3 argumentos de
--    20261026000001_notifications_claim_due_reminders_fn.sql.
--
-- SECURITY INVOKER en ambas: el cron entra autenticado como staff (SEC-003); la política de
-- UPDATE de notifications_reminders ya se lo permite vía auth_is_staff().
-- Cumplimiento: ARCH-006, SEC-001/003/004, PERF-003 (usa el índice (status, send_at)), INT-008.

DROP FUNCTION public.notifications_claim_due_reminders(timestamptz, integer, integer);

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
