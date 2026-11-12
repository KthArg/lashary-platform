-- payments_appointment_balances.test.sql
-- US-MOR-02 · feature payments — saldo actual por cita (contrato payments-api.md).
-- El saldo es la suma de los asientos de la cita: con anticipo menor que el cargo debe lo que falta, una
-- cita saldada devuelve cero, una sin asientos no devuelve fila, y solo salen las citas pedidas. Más de
-- 200 ids es un error. Staff lee; la clienta no ve nada y anon no tiene EXECUTE (SEC-001, SEC-002).
-- Los asientos se escriben por payments_record_close_entries, como en payments_unpaid_charges.test.sql;
-- todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'balances-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'balances-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-0000000000f2',
   'Clienta con saldos', 'balances-clienta@test.local', '00000000020');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

-- a0f1: cargo 25000, anticipo 5000 → debe 20000. a0f2: cargo 5000, anticipo 5000 → saldada (0).
-- a0f3: cargo 30000 sin anticipo → debe 30000. a0f4: sin asientos.
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a0f1', 25000, 5000);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a0f2', 5000, 5000);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a0f3', 30000, 0);

SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT pending FROM public.payments_appointment_balances(
     ARRAY['00000000-0000-0000-0000-00000000a0f1']::uuid[])),
  20000::bigint, 'una cita con anticipo menor que el cargo debe lo que falta pagar');

SELECT is(
  (SELECT pending FROM public.payments_appointment_balances(
     ARRAY['00000000-0000-0000-0000-00000000a0f2']::uuid[])),
  0::bigint, 'una cita saldada devuelve cero');

SELECT is(
  (SELECT pending FROM public.payments_appointment_balances(
     ARRAY['00000000-0000-0000-0000-00000000a0f3']::uuid[])),
  30000::bigint, 'sin anticipo debe todo el cargo');

SELECT is(
  (SELECT count(*)::int FROM public.payments_appointment_balances(
     ARRAY['00000000-0000-0000-0000-00000000a0f4']::uuid[])),
  0, 'una cita sin asientos no devuelve fila');

SELECT is(
  (SELECT count(*)::int FROM public.payments_appointment_balances(
     ARRAY['00000000-0000-0000-0000-00000000a0f1', '00000000-0000-0000-0000-00000000a0f3']::uuid[])),
  2, 'solo salen las citas pedidas');

SELECT is(
  (SELECT count(*)::int FROM public.payments_appointment_balances(ARRAY[]::uuid[]))
  + (SELECT count(*)::int FROM public.payments_appointment_balances(NULL)),
  0, 'una lista vacía o nula no devuelve filas');

SELECT throws_ok(
  $$SELECT * FROM public.payments_appointment_balances(
      ARRAY(SELECT gen_random_uuid() FROM generate_series(1, 201)))$$,
  '54000', 'payments_too_many_ids', 'más de 200 ids es un error');

-- ── Como la clienta ────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.payments_appointment_balances(
     ARRAY['00000000-0000-0000-0000-00000000a0f1', '00000000-0000-0000-0000-00000000a0f3']::uuid[])),
  0, 'la clienta no ve ni los saldos de sus propias citas por el contrato');

-- ── Como anon ──────────────────────────────────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.payments_appointment_balances(ARRAY[]::uuid[])$$,
  '42501', NULL, 'anon no puede consultar los saldos');

SELECT * FROM finish();
ROLLBACK;
