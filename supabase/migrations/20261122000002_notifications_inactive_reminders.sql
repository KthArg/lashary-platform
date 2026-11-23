-- 20261122000002_notifications_inactive_reminders.sql
-- US-NOT-06 · feature notifications — el registro de recordatorios a clientas inactivas y la suscripción de
-- cada clienta a esos recordatorios (SPEC de notifications, sección US-NOT-06).
--
-- notifications_inactive_reminders: una fila por recordatorio puesto en cola por la administradora. Es la cola
-- que reclama el ciclo de notificaciones, con el mismo patrón que notifications_aftercare_messages (US-CLI-06):
-- pending → claimed → sent o failed, con intentos, último error y canal. Es también el registro del criterio 3:
-- quién recibió el recordatorio, cuándo (sent_at) y por qué canal.
-- - Como mucho un recordatorio en cola (pending o claimed) por clienta: poner en cola dos veces no duplica.
-- - client_id sin FK a clients_profiles, mismo criterio que los demás registros de envío de notifications.
--   queued_by sí apunta a auth.users, con su índice (PERF-003).
-- - Solo el personal lee. Nadie con sesión inserta: poner en cola es una función SECURITY DEFINER (pieza 7).
--   El personal solo actualiza el resultado del envío (columnas acotadas), porque el ciclo corre con la
--   cuenta de sistema del cron, como en los demás mensajes.
--
-- notifications_inactive_subscriptions: una fila por clienta, con un token aleatorio propio (va en el enlace de
-- baja y no revela quién es la clienta, SEC-004) y opted_out_at, nulo mientras está suscrita. La baja es solo
-- de estos recordatorios (decisión del PO, 2026-11-22). Solo el personal lee: el ciclo necesita el token para
-- armar el enlace. Nadie con sesión escribe: la fila la crea poner en cola, y la baja y volver a suscribirse
-- pasan por funciones SECURITY DEFINER que reciben solo el token (pieza 7).
--
-- Cumplimiento: ARCH-006, DOM-003, SEC-001, SEC-002, SEC-004, PERF-003, INT-008.

CREATE TABLE public.notifications_inactive_reminders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL,
  queued_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'failed')),
  claimed_at   timestamptz,
  attempts     integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error   text CHECK (last_error IS NULL OR char_length(last_error) <= 501),
  last_channel text CHECK (last_channel IN ('whatsapp', 'email')),
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_inactive_reminders_sent_fields
    CHECK ((status = 'sent') = (sent_at IS NOT NULL) AND (status <> 'sent' OR last_channel IS NOT NULL))
);

CREATE UNIQUE INDEX idx_notifications_inactive_reminders_one_queued ON public.notifications_inactive_reminders (client_id) WHERE status IN ('pending', 'claimed');
CREATE INDEX idx_notifications_inactive_reminders_client ON public.notifications_inactive_reminders (client_id, created_at DESC);
CREATE INDEX idx_notifications_inactive_reminders_pending ON public.notifications_inactive_reminders (status, created_at);
CREATE INDEX idx_notifications_inactive_reminders_queued_by ON public.notifications_inactive_reminders (queued_by);

ALTER TABLE public.notifications_inactive_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_inactive_reminders_select_staff"
  ON public.notifications_inactive_reminders FOR SELECT TO authenticated
  USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_inactive_reminders_update_staff"
  ON public.notifications_inactive_reminders FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_inactive_reminders FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, client_id, queued_by, status, claimed_at, attempts, last_error, last_channel, sent_at, created_at)
  ON public.notifications_inactive_reminders TO authenticated;
GRANT UPDATE (status, claimed_at, attempts, last_error, last_channel, sent_at)
  ON public.notifications_inactive_reminders TO authenticated;

CREATE TABLE public.notifications_inactive_subscriptions (
  client_id    uuid PRIMARY KEY,
  token        uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  opted_out_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications_inactive_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_inactive_subscriptions_select_staff"
  ON public.notifications_inactive_subscriptions FOR SELECT TO authenticated
  USING ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_inactive_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT (client_id, token, opted_out_at, created_at, updated_at)
  ON public.notifications_inactive_subscriptions TO authenticated;
