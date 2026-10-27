-- 20261026000001_notifications_claim_due_reminders_fn.sql
-- US-NOT-03 · feature notifications — corrige la segunda ronda de la auditoría (revisión del
-- líder, 2026-10-24) sobre A2: el reclamo (status='pending' -> 'claimed') no tenía vida limitada,
-- así que una fila se perdía para siempre si el cron moría a mitad de lote, si markSent fallaba
-- después de un envío exitoso, o si cualquier otro paso posterior al reclamo no terminaba de
-- escribir su resultado. También pedía procesar en tandas con límite en vez de reclamar todo de
-- una vez.
--
-- notifications_claim_due_reminders reclama en una sola instrucción, atómica por fila
-- (FOR UPDATE SKIP LOCKED: dos corridas superpuestas del cron se reparten las filas sin bloquearse
-- entre sí ni reclamar la misma dos veces, DOM-010): lo vencido por pending+send_at, o lo que lleva
-- reclamado (claimed) más de p_claim_ttl_minutes sin que nadie lo haya resuelto. p_now viene de
-- shared/clock.ts (DOM-004: nunca now() de la aplicación, pero sí dentro de la función SQL, igual
-- que scheduling_book_appointment) para que las pruebas de integración controlen el tiempo sin
-- tocar el reloj del servidor de Postgres.
-- SECURITY INVOKER: el cron entra autenticado como staff (SEC-003); la política de UPDATE de
-- notifications_reminders ya se la permite via auth_is_staff(), no hace falta elevar privilegio.
-- Cumplimiento: ARCH-006, SEC-001/003, PERF-003 (usa el índice (status, send_at)), INT-008.

CREATE FUNCTION public.notifications_claim_due_reminders(
  p_now               timestamptz,
  p_claim_ttl_minutes integer,
  p_batch_size        integer
)
RETURNS SETOF public.notifications_reminders
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.notifications_reminders
  SET status = 'claimed', claimed_at = p_now
  WHERE id IN (
    SELECT id FROM public.notifications_reminders
    WHERE (status = 'pending' AND send_at <= p_now)
       OR (status = 'claimed' AND claimed_at < p_now - (p_claim_ttl_minutes || ' minutes')::interval)
    ORDER BY send_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

GRANT EXECUTE ON FUNCTION public.notifications_claim_due_reminders(timestamptz, integer, integer) TO authenticated;
