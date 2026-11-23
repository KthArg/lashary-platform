-- 20261122000004_notifications_inactive_queue_and_optout_fns.sql
-- US-NOT-06 · feature notifications — poner recordatorios a clientas inactivas en cola (criterio 2) y darse de
-- baja o volver a suscribirse con el token del enlace (criterio 4). SPEC de notifications, sección US-NOT-06.
--
-- notifications_queue_inactive_reminders(clientas, tope por envío, días mínimos entre recordatorios)
--   => una fila con cuántas puso en cola y cuántas dejó fuera, por qué.
-- - Solo administradora (notifications_not_admin, 42501). Sirve igual para una clienta (envío individual) que
--   para varias (masivo): una sola llamada, sin consultas por clienta desde la aplicación (PERF-005).
-- - Rechaza entera una lista vacía o nula (notifications_inactive_no_clients) y una con más clientas distintas que
--   el tope (notifications_inactive_too_many), ambas 22023. El tope y los días mínimos los pasa la aplicación:
--   el PO todavía no fijó los números, y así cambiarlos no exige otra migración.
-- - Deja fuera, sin error, a quien se dio de baja, a quien ya tiene un recordatorio en cola, a quien recibió uno
--   hace menos de los días mínimos (0 lo desactiva) y a los ids que no son de una clienta (los busca por el
--   contrato de clients, ARCH-005). Un id repetido cuenta una vez.
-- - Crea la suscripción con su token la primera vez. El índice único de la cola cubre una carrera entre dos
--   administradoras: la segunda cuenta a esa clienta como ya en cola.
-- - Deja notifications.inactive_reminders.queued en la bitácora, con los conteos y las clientas puestas en cola.
--
-- notifications_unsubscribe_inactive(token) y notifications_resubscribe_inactive(token):
-- - Las ejecuta anon: la clienta llega desde el correo sin iniciar sesión. Solo reciben el token, que no dice quién
--   es la clienta (SEC-004), y no devuelven nada: un token que no existe responde igual que uno válido. Adivinar
--   un token (gen_random_uuid, 122 bits) no es viable, así que no llevan límite propio (SEC-007).
-- - Son idempotentes: la segunda baja conserva la fecha de la primera. La baja es solo de estos recordatorios
--   (decisión del PO, 2026-11-22). No dejan evento en audit_events, que exige un actor con sesión: el registro es
--   opted_out_at y updated_at de la suscripción.
-- - Un recordatorio que ya estaba en cola al darse de baja no sale: el reclamo del ciclo de envío salta a quien se
--   dio de baja (pieza del envío).
--
-- SECURITY DEFINER con search_path fijo: nadie con sesión escribe estas tablas directo.
-- Cumplimiento: ARCH-005, DOM-006, DOM-012, SEC-001, SEC-004, SEC-005, SEC-007, PERF-005, INT-008.

CREATE FUNCTION public.notifications_queue_inactive_reminders(
  p_client_ids       uuid[],
  p_max_clients      integer,
  p_min_days_between integer
)
RETURNS TABLE (queued integer, already_queued integer, opted_out integer, recent integer, unknown integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids          uuid[];
  v_eligible     uuid[];
  v_queued       integer;
  v_already      integer;
  v_opted_out    integer;
  v_recent       integer;
  v_unknown      integer;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'notifications_not_admin' USING ERRCODE = '42501';
  END IF;

  v_ids := ARRAY(SELECT DISTINCT id FROM unnest(p_client_ids) AS id WHERE id IS NOT NULL);
  IF p_client_ids IS NULL OR cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'notifications_inactive_no_clients' USING ERRCODE = '22023';
  END IF;
  IF p_max_clients IS NULL OR p_max_clients <= 0 OR p_min_days_between IS NULL OR p_min_days_between < 0 THEN
    RAISE EXCEPTION 'notifications_inactive_invalid_limits' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_ids) > p_max_clients THEN
    RAISE EXCEPTION 'notifications_inactive_too_many' USING ERRCODE = '22023';
  END IF;

  WITH requested AS (
    SELECT id FROM unnest(v_ids) AS id
  ),
  classified AS (
    SELECT r.id,
           CASE
             WHEN c.client_id IS NULL THEN 'unknown'
             WHEN s.opted_out_at IS NOT NULL THEN 'opted_out'
             WHEN EXISTS (SELECT 1 FROM public.notifications_inactive_reminders q
                           WHERE q.client_id = r.id AND q.status IN ('pending', 'claimed')) THEN 'already_queued'
             WHEN p_min_days_between > 0 AND EXISTS (
                    SELECT 1 FROM public.notifications_inactive_reminders q
                     WHERE q.client_id = r.id AND q.status = 'sent'
                       AND q.sent_at > now() - make_interval(days => p_min_days_between)) THEN 'recent'
             ELSE 'eligible'
           END AS outcome
      FROM requested r
      LEFT JOIN public.clients_all_display_names() c ON c.client_id = r.id
      LEFT JOIN public.notifications_inactive_subscriptions s ON s.client_id = r.id
  )
  SELECT array_agg(id) FILTER (WHERE outcome = 'eligible'),
         count(*) FILTER (WHERE outcome = 'already_queued'),
         count(*) FILTER (WHERE outcome = 'opted_out'),
         count(*) FILTER (WHERE outcome = 'recent'),
         count(*) FILTER (WHERE outcome = 'unknown')
    INTO v_eligible, v_already, v_opted_out, v_recent, v_unknown
    FROM classified;

  v_eligible := coalesce(v_eligible, ARRAY[]::uuid[]);

  INSERT INTO public.notifications_inactive_subscriptions (client_id)
  SELECT id FROM unnest(v_eligible) AS id
  ON CONFLICT (client_id) DO NOTHING;

  INSERT INTO public.notifications_inactive_reminders (client_id, queued_by)
  SELECT id, auth.uid() FROM unnest(v_eligible) AS id
  ON CONFLICT (client_id) WHERE status IN ('pending', 'claimed') DO NOTHING;
  GET DIAGNOSTICS v_queued = ROW_COUNT;

  v_already := v_already + (cardinality(v_eligible) - v_queued);

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'notifications.inactive_reminders.queued',
    'notifications_inactive_reminder_batch',
    gen_random_uuid(),
    jsonb_build_object(
      'queued',        v_queued,
      'alreadyQueued', v_already,
      'optedOut',      v_opted_out,
      'recent',        v_recent,
      'unknown',       v_unknown,
      'clientIds',     to_jsonb(v_eligible)
    )
  );

  RETURN QUERY SELECT v_queued, v_already, v_opted_out, v_recent, v_unknown;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_queue_inactive_reminders(uuid[], integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notifications_queue_inactive_reminders(uuid[], integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.notifications_queue_inactive_reminders(uuid[], integer, integer) TO authenticated;

CREATE FUNCTION public.notifications_unsubscribe_inactive(p_token uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.notifications_inactive_subscriptions
     SET opted_out_at = now(), updated_at = now()
   WHERE token = p_token AND opted_out_at IS NULL;
$$;

CREATE FUNCTION public.notifications_resubscribe_inactive(p_token uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.notifications_inactive_subscriptions
     SET opted_out_at = NULL, updated_at = now()
   WHERE token = p_token AND opted_out_at IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.notifications_unsubscribe_inactive(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notifications_resubscribe_inactive(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notifications_unsubscribe_inactive(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notifications_resubscribe_inactive(uuid) TO anon, authenticated;
