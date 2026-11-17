-- scheduling_book_blocked_by_delinquency.test.sql
-- US-MOR-02 · scheduling — la reserva de una técnica rechaza a la clienta con una morosidad confirmada que
-- todavía debe (criterios 1, 3 y 5; DOM-012). El rechazo devuelve la fila con id nulo, no crea ninguna cita
-- y deja el evento en la bitácora con el monto y la cita que bloquean; cada intento deja el suyo. Una
-- clienta sin morosidad, con una por revisar, o que ya saldó la cita, agenda normal. La función auxiliar que
-- escribe el evento no se puede llamar desde fuera (SEC-001, SEC-002).
-- Lunes de prueba: 2027-09-06 (abierto 09:00–12:00 y 12:00–17:00). Hora de Costa Rica, UTC-6.
-- Los asientos se escriben por payments_record_close_entries; todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000007a1', 'bloq-admin@test.local'),
  ('00000000-0000-0000-0000-0000000007a2', 'bloq-morosa@test.local'),
  ('00000000-0000-0000-0000-0000000007a3', 'bloq-limpia@test.local'),
  ('00000000-0000-0000-0000-0000000007a4', 'bloq-por-revisar@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000007a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000007c2', '00000000-0000-0000-0000-0000000007a2', 'Clienta morosa', 'bloq-morosa@test.local', '+50688881002'),
  ('00000000-0000-0000-0000-0000000007c3', '00000000-0000-0000-0000-0000000007a3', 'Clienta limpia', 'bloq-limpia@test.local', '+50688881003'),
  ('00000000-0000-0000-0000-0000000007c4', '00000000-0000-0000-0000-0000000007a4', 'Clienta por revisar', 'bloq-por-revisar@test.local', '+50688881004');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000007f4', 'zz-test bloqueo', 'lash_classic',
   35000, 25000, 60, 45, 15, 0, 'cuidados', true);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 1, 540, 720),
  ('00000000-0000-0000-0000-000000000a01', 1, 720, 1020);

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);

-- La morosa debe 25000 de la cita a0b1 (confirmada). La clienta por revisar debe 10000 de a0b2, pero su
-- morosidad solo está por revisar.
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000007c2', '00000000-0000-0000-0000-00000000a0b1', 25000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000007c4', '00000000-0000-0000-0000-00000000a0b2', 10000, 0);

INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000007c2', '00000000-0000-0000-0000-00000000a0b1', 25000, 'active',
   now() - interval '5 days', now(), '00000000-0000-0000-0000-0000000007a1'),
  ('00000000-0000-0000-0000-0000000007c4', '00000000-0000-0000-0000-00000000a0b2', 10000, 'pending_review',
   now() - interval '1 day', NULL, NULL);

-- ── La morosa intenta agendar ──────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a2","role":"authenticated"}', true);

CREATE TEMP TABLE blocked_try AS
  SELECT * FROM public.scheduling_book_appointment(
    '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
    '00000000-0000-0000-0000-0000000007f4', true);
GRANT SELECT ON blocked_try TO authenticated;

SELECT is((SELECT id FROM blocked_try), NULL::uuid,
  'una clienta con una morosidad confirmada que debe recibe la fila con id nulo, sin excepción');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments WHERE client_id = '00000000-0000-0000-0000-0000000007c2'),
  0, 'el bloqueo no crea ninguna cita');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE action = 'scheduling.booking.blocked_by_delinquency'
      AND entity_id = '00000000-0000-0000-0000-0000000007c2'),
  1, 'el bloqueo deja su evento en la bitácora, sobre la clienta');

SELECT is(
  (SELECT payload #>> '{blockingAppointments,0,pending}' FROM public.audit_events
    WHERE action = 'scheduling.booking.blocked_by_delinquency'
      AND entity_id = '00000000-0000-0000-0000-0000000007c2'),
  '25000', 'el evento guarda el monto que debe, para revisar si bloqueó por error');

SELECT is(
  (SELECT actor_id FROM public.audit_events
    WHERE action = 'scheduling.booking.blocked_by_delinquency'
      AND entity_id = '00000000-0000-0000-0000-0000000007c2'),
  '00000000-0000-0000-0000-0000000007a2'::uuid, 'el actor es la sesión que intentó agendar');

-- Un segundo intento deja su propio evento.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a2","role":"authenticated"}', true);
SELECT id FROM public.scheduling_book_appointment(
  '00000000-0000-0000-0000-000000000a01', '2027-09-06 10:00-06',
  '00000000-0000-0000-0000-0000000007f4', true);
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE action = 'scheduling.booking.blocked_by_delinquency'
      AND entity_id = '00000000-0000-0000-0000-0000000007c2'),
  2, 'cada intento bloqueado queda registrado');

-- ── Quien no está bloqueada agenda normal ──────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a3","role":"authenticated"}', true);

SELECT isnt(
  (SELECT id FROM public.scheduling_book_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 11:00-06',
     '00000000-0000-0000-0000-0000000007f4', true)),
  NULL::uuid, 'una clienta sin morosidad agenda normal');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a4","role":"authenticated"}', true);

SELECT isnt(
  (SELECT id FROM public.scheduling_book_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 13:00-06',
     '00000000-0000-0000-0000-0000000007f4', true)),
  NULL::uuid, 'una morosidad por revisar no bloquea: solo la confirmada tiene consecuencias (DOM-012)');

-- ── Al saldar la cita, la morosa recupera el acceso sola ───────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);
INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
VALUES ('00000000-0000-0000-0000-0000000007c2', '00000000-0000-0000-0000-00000000a0b1', 'deposit_credit', -25000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a2","role":"authenticated"}', true);

SELECT isnt(
  (SELECT id FROM public.scheduling_book_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 15:00-06',
     '00000000-0000-0000-0000-0000000007f4', true)),
  NULL::uuid, 'una vez saldada la cita la clienta vuelve a agendar, sin tocar ninguna tabla de morosidad');

-- ── La función auxiliar no se llama desde fuera ────────────────────────────────
SELECT throws_ok(
  $$SELECT public.scheduling_booking_blocked_by_delinquency(
      '00000000-0000-0000-0000-0000000007c2', '00000000-0000-0000-0000-000000000a01',
      now(), '00000000-0000-0000-0000-0000000007f4')$$,
  '42501', NULL, 'una clienta no puede falsear eventos llamando a la función auxiliar');

SELECT * FROM finish();
ROLLBACK;
