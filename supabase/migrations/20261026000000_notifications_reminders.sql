-- 20261026000000_notifications_reminders.sql
-- US-NOT-03 · feature notifications — porta el canal completo (ADR-0006): tabla de recordatorios
-- con su registro de envíos, estado y reintentos (criterio 4). Solo la administradora (staff) la
-- usa: el cron la lee y escribe autenticado como staff (sin service-role, SEC-003); la clienta no
-- tiene ninguna política sobre esta tabla.
-- Cumplimiento: ARCH-006 (tabla con prefijo notifications_), SEC-001/002 (RLS + aislamiento),
-- PERF-003 (índices sobre lo filtrado), INT-008 (una migración, forward-only).
--
-- appointment_id y client_id son identificadores sin FK a scheduling_appointments ni
-- clients_profiles a propósito: esta tabla es un registro operativo de envíos, no un dato de
-- negocio permanente (a diferencia del FK de payments a clients_profiles, ADR-0009), y evita abrir
-- un segundo acoplamiento cross-feature sin esa misma discusión.
--
-- claimed y claimed_at: reclamo atómico contra envíos duplicados. claimed_at limita la vida del
-- reclamo: si el cron muere a mitad de lote, la fila vuelve a pending al vencer el TTL.

CREATE TABLE public.notifications_reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL,
  client_id       uuid NOT NULL,
  starts_at       timestamptz NOT NULL,
  technique_name  text NOT NULL CHECK (length(btrim(technique_name)) > 0),
  send_at         timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'cancelled', 'failed')),
  claimed_at      timestamptz,
  attempts        integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error      text,
  last_channel    text CHECK (last_channel IN ('whatsapp', 'email')),
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_reminders_one_per_appointment UNIQUE (appointment_id)
);

-- PERF-003: send_at se filtra por rango al buscar lo vencido o lo reclamado hace demasiado;
-- status acompaña ese filtro. appointment_id ya tiene índice único por el UNIQUE de arriba.
CREATE INDEX idx_notifications_reminders_due ON public.notifications_reminders (status, send_at);

ALTER TABLE public.notifications_reminders ENABLE ROW LEVEL SECURITY;

-- Reusa auth_is_staff() (20260902000001): la única identidad que opera esta tabla es la
-- administradora, incluida la ejecución del cron autenticada con sus credenciales (SEC-003/004:
-- nunca la service-role key).
CREATE POLICY "notifications_reminders_select_staff"
  ON public.notifications_reminders FOR SELECT TO authenticated USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_reminders_insert_staff"
  ON public.notifications_reminders FOR INSERT TO authenticated WITH CHECK ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_reminders_update_staff"
  ON public.notifications_reminders FOR UPDATE TO authenticated USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));
