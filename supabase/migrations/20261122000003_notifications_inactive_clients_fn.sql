-- 20261122000003_notifications_inactive_clients_fn.sql
-- US-NOT-06 · feature notifications — la lista de clientas inactivas (criterio 1; SPEC de notifications,
-- sección US-NOT-06).
-- notifications_inactive_clients(fecha de corte) => una fila por clienta sin visita completada desde esa fecha
-- y sin cita próxima en pie, incluidas las que nunca vinieron (decisión del PO, 2026-11-22). La fecha de corte
-- la calcula la aplicación con el reloj inyectado (hoy menos el rango que elige la administradora, DOM-004).
-- - Junta los contratos: el nombre de todas las clientas de clients (clients_all_display_names), la última visita
--   y la próxima cita de scheduling (scheduling_client_last_visits, scheduling_client_next_appointments). No lee
--   tablas de otra feature (ARCH-005).
-- - Por cada una trae si se dio de baja (sin fila de suscripción, está suscrita) y su último recordatorio: estado,
--   cuándo se puso en cola y cuándo salió.
-- - Solo el personal: SECURITY INVOKER, así que la RLS de cada feature decide, y además devuelve vacío si quien
--   llama no es personal (una clienta vería su propia fila en clients y scheduling). anon no la ejecuta.
-- - No pagina ni ordena: PostgREST pagina y cuenta, como con clients_list (PERF-002). STRICT: sin fecha de
--   corte no devuelve filas.
-- Cumplimiento: ARCH-005, INT-003, DOM-003, DOM-004, SEC-001, PERF-002, INT-008.

CREATE FUNCTION public.notifications_inactive_clients(p_since timestamptz)
RETURNS TABLE (
  client_id              uuid,
  full_name              text,
  last_visit_at          timestamptz,
  opted_out              boolean,
  last_reminder_status   text,
  last_reminder_queued_at timestamptz,
  last_reminder_sent_at  timestamptz
)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.client_id,
         c.full_name,
         visit.last_visit_at,
         subscription.opted_out_at IS NOT NULL,
         reminder.status,
         reminder.created_at,
         reminder.sent_at
    FROM public.clients_all_display_names() c
    LEFT JOIN public.scheduling_client_last_visits() visit ON visit.client_id = c.client_id
    LEFT JOIN public.scheduling_client_next_appointments() upcoming ON upcoming.client_id = c.client_id
    LEFT JOIN public.notifications_inactive_subscriptions subscription ON subscription.client_id = c.client_id
    LEFT JOIN LATERAL (
      SELECT r.status, r.created_at, r.sent_at
        FROM public.notifications_inactive_reminders r
       WHERE r.client_id = c.client_id
       ORDER BY r.created_at DESC
       LIMIT 1
    ) reminder ON true
   WHERE (SELECT public.auth_is_staff())
     AND upcoming.client_id IS NULL
     AND (visit.last_visit_at IS NULL OR visit.last_visit_at < p_since);
$$;

REVOKE ALL ON FUNCTION public.notifications_inactive_clients(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notifications_inactive_clients(timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.notifications_inactive_clients(timestamptz) TO authenticated;
