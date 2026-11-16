-- payments_unpaid_charges.test.sql
-- US-MOR-01 · feature payments — citas cerradas con saldo pendiente (contrato payments-api.md).
-- Una cita entra si tiene un cargo cerrado al corte o antes y la suma de sus asientos es mayor que
-- cero; sale pagada por completo, cerrada después del corte o sin cargo. Orden por cierre y luego por
-- cita, con tope. Staff lee; la clienta no ve nada y anon no tiene EXECUTE (SEC-001, SEC-002).
-- Los asientos se escriben por payments_record_close_entries en el contexto del cierre, como en
-- payments_ledger_entries.test.sql; todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'unpaid-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'unpaid-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000e1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000ce01', '00000000-0000-0000-0000-0000000000e2',
   'Clienta que debe', 'unpaid-clienta@test.local', '00000000010'),
  ('00000000-0000-0000-0000-00000000ce02', NULL,
   'Clienta sin cuenta', 'unpaid-otra@test.local', '00000000011');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- a001: cargo 25000, anticipo 5000 → debe 20000. a002: cargo 5000, anticipo 5000 → pagada.
-- a003: cargo 30000 sin anticipo → debe 30000.
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ce01', '00000000-0000-0000-0000-00000000a0e1', 25000, 5000);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ce01', '00000000-0000-0000-0000-00000000a0e2', 5000, 5000);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ce02', '00000000-0000-0000-0000-00000000a0e3', 30000, 0);

SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT pending FROM public.payments_unpaid_charges(now() + interval '1 day', 100)
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0e1'),
  20000::bigint, 'una cita con anticipo menor que el cargo entra con lo que falta pagar');

SELECT is(
  (SELECT pending FROM public.payments_unpaid_charges(now() + interval '1 day', 100)
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0e3'),
  30000::bigint, 'sin anticipo, entra con todo el cargo');

SELECT is(
  (SELECT count(*)::int FROM public.payments_unpaid_charges(now() + interval '1 day', 100)
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0e2'),
  0, 'una cita pagada por completo no entra');

SELECT is(
  (SELECT client_id FROM public.payments_unpaid_charges(now() + interval '1 day', 100)
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0e3'),
  '00000000-0000-0000-0000-00000000ce02'::uuid, 'devuelve la clienta de la cita, también la que no tiene cuenta');

SELECT ok(
  (SELECT closed_at FROM public.payments_unpaid_charges(now() + interval '1 day', 100)
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0e1') <= now(),
  'closed_at es la fecha del cargo, el momento del cierre');

SELECT is(
  (SELECT count(*)::int FROM public.payments_unpaid_charges(now() - interval '1 day', 100)),
  0, 'una cita cerrada después del corte no entra');

SELECT is(
  (SELECT appointment_id FROM public.payments_unpaid_charges(now() + interval '1 day', 100) LIMIT 1),
  '00000000-0000-0000-0000-00000000a0e1'::uuid,
  'con el mismo cierre, el orden es por cita y la primera es la de id menor');

SELECT is(
  (SELECT count(*)::int FROM public.payments_unpaid_charges(now() + interval '1 day', 1)),
  1, 'el tope limita la respuesta');

SELECT is(
  (SELECT count(*)::int FROM public.payments_unpaid_charges(now() + interval '1 day', 0)),
  1, 'un tope menor que 1 se trata como 1');

-- Cursor: la página siguiente empieza después de la última fila de la anterior.
SELECT is(
  (SELECT appointment_id FROM public.payments_unpaid_charges(
     now() + interval '1 day', 1,
     (SELECT closed_at FROM public.payments_unpaid_charges(now() + interval '1 day', 1)),
     '00000000-0000-0000-0000-00000000a0e1')),
  '00000000-0000-0000-0000-00000000a0e3'::uuid,
  'con el cursor de la primera fila, la página siguiente trae la cita que sigue (la pagada se salta)');

SELECT is(
  (SELECT count(*)::int FROM public.payments_unpaid_charges(
     now() + interval '1 day', 100,
     (SELECT closed_at FROM public.payments_unpaid_charges(now() + interval '1 day', 1)),
     '00000000-0000-0000-0000-00000000a0e3')),
  0, 'después de la última fila ya no hay más páginas');

-- La clienta no ve el ledger: la RLS devuelve una lista vacía.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.payments_unpaid_charges(now() + interval '1 day', 100)),
  0, 'la clienta no ve ninguna cita con saldo pendiente');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.payments_unpaid_charges(now() + interval '1 day', 100)$$,
  '42501', NULL, 'anon: no puede consultar las citas con saldo pendiente');

SELECT * FROM finish();
ROLLBACK;
