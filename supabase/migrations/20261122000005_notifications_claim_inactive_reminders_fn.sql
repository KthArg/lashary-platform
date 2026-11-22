-- 20261122000005_notifications_claim_inactive_reminders_fn.sql
-- US-NOT-06 · feature notifications — el ciclo de notificaciones reclama los recordatorios a clientas inactivas
-- que están en cola (SPEC de notifications, sección US-NOT-06). Mismo patrón que
-- notifications_claim_aftercare_messages (US-CLI-06): lote acotado, FOR UPDATE SKIP LOCKED para que dos corridas
-- no reclamen la misma fila, y un reclamo vencido vuelve a reclamarse.
-- - Antes de reclamar, deja como failed («la clienta se dio de baja antes del envío») los recordatorios en cola de
--   quien se dio de baja después de ponerse en cola: no salen (criterio 4) y quedan en el registro con el motivo.
-- - Devuelve, con cada fila reclamada, el nombre de la clienta (por el contrato de clients, ARCH-005) y su token de
--   baja, para armar el mensaje y el enlace sin otra consulta por clienta (PERF-005).
-- - Solo el personal (42501): el ciclo corre con la cuenta de sistema del cron. SECURITY DEFINER con search_path
--   fijo, porque nadie con sesión lee el token por fuera del personal ni escribe la cola directo.
-- Cumplimiento: ARCH-005, DOM-012, SEC-001, PERF-005, INT-008.

CREATE FUNCTION public.notifications_claim_inactive_reminders(
  p_now               timestamptz,
  p_batch_size        integer,
  p_claim_ttl_minutes integer
)
RETURNS TABLE (id uuid, client_id uuid, attempts integer, created_at timestamptz, full_name text, token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (SELECT public.auth_is_staff()) THEN
    RAISE EXCEPTION 'notifications_claim_inactive_reminders: solo el personal puede reclamar recordatorios' USING ERRCODE = '42501';
  END IF;
  IF p_batch_size IS NULL OR p_batch_size <= 0 OR p_claim_ttl_minutes IS NULL OR p_claim_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_inactive_reminders: el lote y el tiempo del reclamo deben ser enteros positivos'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.notifications_inactive_reminders AS r
     SET status = 'failed', claimed_at = NULL, last_error = 'la clienta se dio de baja antes del envío'
    FROM public.notifications_inactive_subscriptions s
   WHERE s.client_id = r.client_id
     AND s.opted_out_at IS NOT NULL
     AND (r.status = 'pending'
          OR (r.status = 'claimed' AND r.claimed_at < p_now - make_interval(mins => p_claim_ttl_minutes)));

  RETURN QUERY
  WITH due AS MATERIALIZED (
    SELECT r.id
      FROM public.notifications_inactive_reminders r
     WHERE r.status = 'pending'
        OR (r.status = 'claimed' AND r.claimed_at < p_now - make_interval(mins => p_claim_ttl_minutes))
     ORDER BY r.created_at
     LIMIT p_batch_size
     FOR UPDATE OF r SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.notifications_inactive_reminders AS r
       SET status = 'claimed', claimed_at = p_now
      FROM due
     WHERE r.id = due.id
    RETURNING r.id, r.client_id, r.attempts, r.created_at
  )
  SELECT claimed.id, claimed.client_id, claimed.attempts, claimed.created_at, names.full_name, s.token
    FROM claimed
    JOIN public.notifications_inactive_subscriptions s ON s.client_id = claimed.client_id
    LEFT JOIN public.clients_all_display_names() names ON names.client_id = claimed.client_id
   ORDER BY claimed.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_claim_inactive_reminders(timestamptz, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifications_claim_inactive_reminders(timestamptz, integer, integer) TO authenticated;
