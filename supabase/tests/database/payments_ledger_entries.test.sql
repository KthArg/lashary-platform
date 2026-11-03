-- payments_ledger_entries.test.sql
-- US-AGE-12 · feature payments — ledger append-only (DOM-005, SEC-001).
-- Staff registra el cargo y el crédito del anticipo por la función, el saldo es la suma de asientos,
-- nadie (ni staff) hace UPDATE ni DELETE, una cita no se cobra dos veces y la clienta no ve ni
-- escribe nada. El rol se siembra como superusuario local dentro de la transacción; no se usa la
-- service-role key (SEC-003) y todo se deshace con ROLLBACK.
-- Complementa src/features/payments/__tests__/ledger-rls-isolation.test.ts (SEC-002, tokens reales).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'ledger-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'ledger-clienta@test.local'),
  ('00000000-0000-0000-0000-0000000000f3', 'ledger-otra@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-0000000000f2',
   'Clienta del ledger', 'ledger-clienta@test.local', '00000000000'),
  ('00000000-0000-0000-0000-00000000cf02', '00000000-0000-0000-0000-0000000000f3',
   'Otra clienta', 'ledger-otra@test.local', '00000000001');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

SELECT is(
  public.payments_record_close_entries(
    '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a001', 25000, 5000),
  20000::bigint,
  'cierre: lo que queda por pagar es el cargo menos el anticipo');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a001'),
  2, 'cierre con anticipo: dos asientos, el cargo y el crédito');

SELECT is(
  (SELECT amount FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a001' AND kind = 'charge'),
  25000::bigint, 'el cargo es positivo y es el precio congelado');

SELECT is(
  (SELECT amount FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a001' AND kind = 'deposit_credit'),
  (-5000)::bigint, 'el crédito del anticipo es negativo');

SELECT is(
  (SELECT created_by FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a001' AND kind = 'charge'),
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'quién registra el asiento sale de la sesión');

SELECT is(
  public.payments_client_balance('00000000-0000-0000-0000-00000000cf01'),
  20000::bigint, 'el saldo es la suma de los asientos');

SELECT is(
  public.payments_record_close_entries(
    '00000000-0000-0000-0000-00000000cf02', '00000000-0000-0000-0000-00000000a002', 30000, 0),
  30000::bigint, 'sin anticipo registrado, queda por pagar todo el cargo');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a002'),
  1, 'sin anticipo registrado: un solo asiento, el cargo');

SELECT throws_ok(
  $$SELECT public.payments_record_close_entries(
      '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a001', 25000, 5000)$$,
  '23505', NULL, 'cerrar dos veces la misma cita no duplica los asientos');

SELECT throws_ok(
  $$SELECT public.payments_record_close_entries(
      '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a003', 0, 0)$$,
  'P0001', 'payments_charge_invalid', 'un cargo en cero no es un cargo');

SELECT throws_ok(
  $$INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount, created_by)
    VALUES ('00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a004',
            'charge', 100, '00000000-0000-0000-0000-0000000000f3')$$,
  '42501', NULL, 'staff no puede escribir quién registró el asiento: la columna no tiene permiso');

SELECT throws_ok(
  $$UPDATE public.payments_ledger_entries SET amount = 1
     WHERE appointment_id = '00000000-0000-0000-0000-00000000a001'$$,
  '42501', NULL, 'ni staff puede hacer UPDATE de un asiento');

SELECT throws_ok(
  $$DELETE FROM public.payments_ledger_entries
     WHERE appointment_id = '00000000-0000-0000-0000-00000000a001'$$,
  '42501', NULL, 'ni staff puede hacer DELETE de un asiento');

-- ── Como clienta ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries),
  0, 'clienta: no ve ningún asiento, ni los suyos');

SELECT is(
  public.payments_client_balance('00000000-0000-0000-0000-00000000cf01'),
  0::bigint, 'clienta: el saldo que ve es 0, no el real');

SELECT throws_ok(
  $$SELECT public.payments_record_close_entries(
      '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a005', 100, 0)$$,
  '42501', NULL, 'clienta: no puede registrar asientos');

-- ── Como anónimo ────────────────────────────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.payments_client_balance('00000000-0000-0000-0000-00000000cf01')$$,
  '42501', NULL, 'anon: no puede consultar el saldo');

SELECT * FROM finish();
ROLLBACK;
