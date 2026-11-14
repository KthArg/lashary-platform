-- 20261113000001_notifications_reapplication_reminders.sql
-- US-NOT-05 · feature notifications — registro de los avisos de re-aplicación ya enviados o
-- intentados, para que cada clienta y técnica reciba el aviso una sola vez por ciclo (decisión
-- del líder del proyecto, 2026-11-13): un ciclo es la última cita completada de esa técnica, así
-- que una nueva cita completada (otro last_completed_at) habilita de nuevo el aviso.
--
-- A diferencia de notifications_reminders (US-NOT-03), esta tabla no es una cola que espera un
-- send_at futuro: la fecha estimada de re-aplicación se recalcula en cada corrida del cron contra
-- scheduling_reapplication_candidates (no hay un evento que dispare la fila de antemano), así que
-- cada corrida intenta de inmediato cuando el dominio dice que ya toca. La fila solo existe para
-- dejar constancia de ese intento: status 'sent' cuando el canal lo confirma, 'failed' cuando se
-- agotan los reintentos entre corridas (mismo tope que MAX_REMINDER_ATTEMPTS de US-NOT-03).
--
-- client_id y technique_id sin FK a clients_profiles ni catalog_techniques, mismo criterio que
-- notifications_reminders: registro operativo de envíos, no dato de negocio permanente.
--
-- Cumplimiento: ARCH-006 (prefijo notifications_), SEC-001/002 (RLS + aislamiento), INT-008.

CREATE TABLE public.notifications_reapplication_reminders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL,
  technique_id       uuid NOT NULL,
  technique_name     text NOT NULL CHECK (length(btrim(technique_name)) > 0),
  last_completed_at  timestamptz NOT NULL,
  due_at             timestamptz NOT NULL,
  status             text NOT NULL CHECK (status IN ('sent', 'failed')),
  attempts           integer NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  last_error         text,
  last_channel       text CHECK (last_channel IN ('whatsapp', 'email')),
  sent_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_reapplication_reminders_one_per_cycle
    UNIQUE (client_id, technique_id, last_completed_at),
  CONSTRAINT notifications_reapplication_reminders_sent_at_matches_status
    CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);

ALTER TABLE public.notifications_reapplication_reminders ENABLE ROW LEVEL SECURITY;

-- Reusa auth_is_staff() (20260902000001): el cron opera esta tabla autenticado como staff
-- (SEC-003/004: nunca la service-role key), igual que notifications_reminders.
CREATE POLICY "notifications_reapplication_reminders_select_staff"
  ON public.notifications_reapplication_reminders FOR SELECT TO authenticated
  USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_reapplication_reminders_insert_staff"
  ON public.notifications_reapplication_reminders FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_reapplication_reminders_update_staff"
  ON public.notifications_reapplication_reminders FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));
