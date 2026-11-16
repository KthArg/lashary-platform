-- delinquency_detect_unpaid.test.sql
-- US-MOR-01 · feature delinquency — detección de pagos sin registrar (criterios 1 y 2, DOM-012).
-- Genera una morosidad `pending_review` por cada cita cerrada con saldo
-- pendiente pasada la gracia, asociada a la clienta, y no toca las que están dentro de la gracia ni las
-- pagadas. Es idempotente, no regenera una descartada y no se queda atascada detrás de las
-- morosidades que ya existen. Solo staff la llama (SEC-001, SEC-002).
-- Los asientos se siembran como superusuario con la sesión de la administradora para que el trigger
-- selle quién los registró; así se les puede poner fecha pasada. Todo se deshace con ROLLBACK y no se usa
-- la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'detect-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'detect-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000c1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-0000000000c2',
   'Clienta que debe', 'detect-clienta@test.local', '00000000030'),
  ('00000000-0000-0000-0000-00000000cc02', NULL,
   'Clienta sin cuenta', 'detect-otra@test.local', '00000000031');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

-- a0c1: cerrada hace 10 días, cargo 25000 y anticipo 5000 → debe 20000.
-- a0c2: cerrada hace 3 días, cargo 10000 → debe 10000, pero dentro de la gracia de 7 días.
-- a0c3: cerrada hace 10 días y pagada por completo.
INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount, created_at)
VALUES
  ('00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-00000000a0c1', 'charge', 25000, now() - interval '10 days'),
  ('00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-00000000a0c1', 'deposit_credit', -5000, now() - interval '10 days'),
  ('00000000-0000-0000-0000-00000000cc02', '00000000-0000-0000-0000-00000000a0c2', 'charge', 10000, now() - interval '3 days'),
  ('00000000-0000-0000-0000-00000000cc02', '00000000-0000-0000-0000-00000000a0c3', 'charge', 5000, now() - interval '10 days'),
  ('00000000-0000-0000-0000-00000000cc02', '00000000-0000-0000-0000-00000000a0c3', 'deposit_credit', -5000, now() - interval '10 days');

SET LOCAL ROLE authenticated;

-- ── Con 7 días de gracia ───────────────────────────────────────────────────────
SELECT is(
  public.delinquency_detect_unpaid(),
  1, 'genera una morosidad: la de la cita impaga pasada la gracia');

SELECT results_eq(
  $$SELECT client_id, state, pending FROM public.delinquency_cases
     WHERE appointment_id = '00000000-0000-0000-0000-00000000a0c1'$$,
  $$VALUES ('00000000-0000-0000-0000-00000000cc01'::uuid, 'pending_review'::text, 20000::bigint)$$,
  'la morosidad queda asociada a la clienta, por revisar y con lo que debe');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_cases
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0c2'),
  0, 'una cita dentro de la gracia no genera morosidad');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_cases
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0c3'),
  0, 'una cita pagada por completo no genera morosidad');

SELECT is(
  public.delinquency_detect_unpaid(),
  0, 'correrla otra vez no duplica nada');

-- ── Una descartada no vuelve ────────────────────────────────────────────────────
RESET ROLE;
UPDATE public.delinquency_cases
   SET state = 'dismissed', decided_at = now(), decided_by = '00000000-0000-0000-0000-0000000000c1'
 WHERE appointment_id = '00000000-0000-0000-0000-00000000a0c1';
SET LOCAL ROLE authenticated;

SELECT is(
  public.delinquency_detect_unpaid(),
  0, 'una morosidad descartada no se vuelve a generar por la misma cita');

-- ── Con la gracia en 1 día entra la de hace 3 días ──────────────────────────────
RESET ROLE;
UPDATE public.delinquency_settings SET grace_days = 1;
SET LOCAL ROLE authenticated;

SELECT is(
  public.delinquency_detect_unpaid(),
  1, 'al bajar la gracia, la cita de hace 3 días ya cuenta');

-- ── Sin atascarse detrás de las que ya existen (más de una página de 200) ───────
RESET ROLE;
INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount, created_at)
SELECT '00000000-0000-0000-0000-00000000cc02',
       ('00000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid,
       'charge', 1000, now() - interval '20 days'
  FROM generate_series(1, 210) AS i;
INSERT INTO public.delinquency_cases (client_id, appointment_id, pending)
SELECT '00000000-0000-0000-0000-00000000cc02',
       ('00000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid,
       1000
  FROM generate_series(1, 210) AS i;
INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount, created_at)
VALUES ('00000000-0000-0000-0000-00000000cc02', '00000000-0000-0000-0000-00000000a0c9', 'charge', 7000, now() - interval '5 days');
SET LOCAL ROLE authenticated;

SELECT is(
  public.delinquency_detect_unpaid(),
  1, 'una cita nueva se detecta aunque 210 morosidades anteriores llenen más de una página');

-- ── Quién la llama ─────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.delinquency_detect_unpaid()$$,
  '42501', NULL, 'la clienta no puede correr la detección');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.delinquency_detect_unpaid()$$,
  '42501', NULL, 'anon no puede correr la detección');

SELECT * FROM finish();
ROLLBACK;
