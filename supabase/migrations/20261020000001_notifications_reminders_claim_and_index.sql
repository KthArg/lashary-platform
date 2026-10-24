-- 20261020000001_notifications_reminders_claim_and_index.sql
-- US-NOT-03 · feature notifications — corrige A1/B1 de la auditoría del 2026-10-23 como migración
-- hacia adelante (INT-008 no admite editar 20261020000000_notifications_reminders.sql in situ).
--
-- A2: agrega el estado 'claimed' para el reclamo atómico (pending -> claimed en una sola
-- instrucción UPDATE...WHERE status='pending') que evita que dos corridas superpuestas del cron
-- manden el mismo recordatorio dos veces.
-- B1: idx_notifications_reminders_appointment es redundante — notifications_reminders_one_per_appointment
-- (UNIQUE) ya crea un índice sobre appointment_id.

ALTER TABLE public.notifications_reminders DROP CONSTRAINT notifications_reminders_status_check;
ALTER TABLE public.notifications_reminders
  ADD CONSTRAINT notifications_reminders_status_check
  CHECK (status IN ('pending', 'claimed', 'sent', 'cancelled', 'failed'));

DROP INDEX public.idx_notifications_reminders_appointment;
