-- payments_ledger_payment_kind.test.sql
-- US-MOR-03 · payments — el ledger admite pagos: asiento `payment`, negativo, siempre de una cita, y
-- varios por cita (pagos parciales, decisión del PO del 2026-11-13). El cargo y el anticipo siguen sin
-- poder duplicarse por cita, y nadie con sesión escribe el ledger directo (DOM-005, hallazgo M3).
-- Los asientos de prueba se escriben como dueño de la tabla, con la sesión de una administradora para
-- que la base fije created_by; todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000012a1', 'ledger-pago-admin@test.local'),
  ('00000000-0000-0000-0000-0000000012a2', 'ledger-pago-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000012a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000012c2', '00000000-0000-0000-0000-0000000012a2', 'Clienta ledger',
        'ledger-pago-clienta@test.local', '+50688885002');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000012a1","role":"authenticated"}', true);

-- La cita e1 se cerró con un cargo de 30000 y un anticipo de 5000: debe 25000.
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-0000000012c2', '00000000-0000-0000-0000-0000000012e1', 30000, 5000);

-- ── Varios pagos por cita ──────────────────────────────────────────────────────
INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
VALUES ('00000000-0000-0000-0000-0000000012c2', '00000000-0000-0000-0000-0000000012e1', 'payment', -10000);

SELECT lives_ok(
  $$INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
    VALUES ('00000000-0000-0000-0000-0000000012c2', '00000000-0000-0000-0000-0000000012e1', 'payment', -1)$$,
  'una cita admite un segundo pago, aunque sea de un colón');

SELECT is(
  (SELECT pending FROM public.payments_appointment_balances(ARRAY['00000000-0000-0000-0000-0000000012e1'::uuid])),
  14999::bigint, 'los pagos bajan el saldo de la cita: 30000 - 5000 - 10000 - 1');

SELECT is(
  (SELECT created_by FROM public.payments_ledger_entries WHERE kind = 'payment' AND amount = -10000),
  '00000000-0000-0000-0000-0000000012a1'::uuid, 'la base fija quién registró el pago, como en todo asiento');

-- ── El cargo y el anticipo siguen sin repetirse ────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
    VALUES ('00000000-0000-0000-0000-0000000012c2', '00000000-0000-0000-0000-0000000012e1', 'charge', 30000)$$,
  '23505', NULL, 'un segundo cargo de la misma cita se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
    VALUES ('00000000-0000-0000-0000-0000000012c2', '00000000-0000-0000-0000-0000000012e1', 'deposit_credit', -5000)$$,
  '23505', NULL, 'un segundo anticipo de la misma cita se rechaza');

-- ── La forma de un pago ────────────────────────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
    VALUES ('00000000-0000-0000-0000-0000000012c2', '00000000-0000-0000-0000-0000000012e1', 'payment', 500)$$,
  '23514', NULL, 'un pago con monto positivo se rechaza: subiría el saldo');

SELECT throws_ok(
  $$INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
    VALUES ('00000000-0000-0000-0000-0000000012c2', NULL, 'payment', -500)$$,
  '23514', NULL, 'un pago sin cita se rechaza');

SELECT has_index('public', 'payments_ledger_entries', 'idx_payments_ledger_entries_appointment',
  'las sumas por cita tienen un índice que cubre también los pagos');

-- ── Nadie con sesión escribe el ledger ─────────────────────────────────────────
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
    VALUES ('00000000-0000-0000-0000-0000000012c2', '00000000-0000-0000-0000-0000000012e1', 'payment', -100)$$,
  '42501', NULL, 'ni la administradora puede insertar un pago directo en el ledger');

SELECT * FROM finish();
ROLLBACK;
