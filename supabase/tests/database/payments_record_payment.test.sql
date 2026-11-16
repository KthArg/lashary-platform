-- payments_record_payment.test.sql
-- US-MOR-03 · payments — registrar un pago: asiento `payment` por el monto en negativo, de 1 colón hasta el
-- saldo de la cita, solo para la clienta de esa cita, y que nadie con sesión pueda llamarla directo (la
-- llama la aprobación de delinquency, SECURITY DEFINER). Se llama como dueño, con la sesión de una
-- administradora para que la base fije created_by. Todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000013a1', 'pago-admin@test.local'),
  ('00000000-0000-0000-0000-0000000013a2', 'pago-clienta@test.local'),
  ('00000000-0000-0000-0000-0000000013a3', 'pago-otra@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000013a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013a2', 'Clienta pago', 'pago-clienta@test.local', '+50688886002'),
  ('00000000-0000-0000-0000-0000000013c3', '00000000-0000-0000-0000-0000000013a3', 'Otra clienta', 'pago-otra@test.local', '+50688886003');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000013a1","role":"authenticated"}', true);

-- e1 debe 25000 (cargo 30000, anticipo 5000); e2 es de la otra clienta; e3 está saldada desde el cierre.
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e1', 30000, 5000);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000013c3', '00000000-0000-0000-0000-0000000013e2', 20000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e3', 10000, 10000);

-- ── Un pago y otro parcial ─────────────────────────────────────────────────────
CREATE TEMP TABLE first_payment AS
  SELECT public.payments_record_payment(
    '00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e1', 10000) AS id;

SELECT is(
  (SELECT amount FROM public.payments_ledger_entries WHERE id = (SELECT id FROM first_payment)),
  -10000::bigint, 'el pago es un asiento nuevo por el monto en negativo, con el id que devuelve');

SELECT is(
  (SELECT kind || '|' || created_by::text FROM public.payments_ledger_entries WHERE id = (SELECT id FROM first_payment)),
  'payment|00000000-0000-0000-0000-0000000013a1', 'es de tipo payment y la base fija quién lo registró');

SELECT lives_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e1', 1)$$,
  'un pago pequeño, de un colón, también se registra');

SELECT is(
  (SELECT pending FROM public.payments_appointment_balances(ARRAY['00000000-0000-0000-0000-0000000013e1'::uuid])),
  14999::bigint, 'los dos pagos parciales bajan el saldo de la cita');

-- ── El tope es el saldo de la cita ─────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e1', 15000)$$,
  '22023', 'payments_payment_exceeds_balance', 'pagar más que el saldo se rechaza');

SELECT lives_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e1', 14999)$$,
  'pagar exactamente el saldo se registra');

SELECT throws_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e1', 1)$$,
  '22023', 'payments_payment_exceeds_balance', 'una cita que quedó en cero no admite otro pago');

SELECT throws_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e3', 100)$$,
  '22023', 'payments_payment_exceeds_balance', 'una cita saldada desde el cierre no admite pagos');

-- ── Monto y clienta ────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c3', '00000000-0000-0000-0000-0000000013e2', 0)$$,
  '22023', 'payments_payment_amount_invalid', 'un monto de cero se rechaza');

SELECT throws_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c3', '00000000-0000-0000-0000-0000000013e2', -500)$$,
  '22023', 'payments_payment_amount_invalid', 'un monto negativo se rechaza');

SELECT throws_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013e2', 500)$$,
  '22023', 'payments_payment_wrong_client', 'no se registra un pago de una cita de otra clienta');

SELECT throws_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c2', '00000000-0000-0000-0000-0000000013ff', 500)$$,
  '22023', 'payments_payment_wrong_client', 'no se registra un pago de una cita sin asientos');

-- ── Nadie con sesión la llama directo ──────────────────────────────────────────
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.payments_record_payment('00000000-0000-0000-0000-0000000013c3', '00000000-0000-0000-0000-0000000013e2', 500)$$,
  '42501', NULL, 'ni la administradora puede registrar un pago llamando a la función directo');

SELECT * FROM finish();
ROLLBACK;
