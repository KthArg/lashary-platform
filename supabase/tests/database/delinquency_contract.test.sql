-- delinquency_contract.test.sql
-- US-MOR-01 · feature delinquency — funciones de lectura del contrato delinquency-api.md (ARCH-005, DOM-012).
-- `active` gana a `pending_review` y `dismissed` no sale; el saldo se suma por estado; el listado de
-- activas va de la más reciente a la más antigua y se pagina; el tope de ids; staff lee, la clienta no ve
-- nada y anon no tiene EXECUTE (SEC-001, SEC-002). Todo se deshace con ROLLBACK (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'contract-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'contract-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000ca41', '00000000-0000-0000-0000-0000000000a2', 'Con activa y por revisar', 'c41@test.local', '00000000051'),
  ('00000000-0000-0000-0000-00000000ca42', NULL, 'Solo por revisar', 'c42@test.local', '00000000052'),
  ('00000000-0000-0000-0000-00000000ca43', NULL, 'Solo descartada', 'c43@test.local', '00000000053'),
  ('00000000-0000-0000-0000-00000000ca44', NULL, 'Dos activas', 'c44@test.local', '00000000054');

-- ca41: una activa (10000, hace 5 días) y una por revisar (5000). ca42: por revisar (7000).
-- ca43: descartada (9000). ca44: dos activas (3000 hace 3 días y 4000 hace 2 días).
INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-00000000ca41', '00000000-0000-0000-0000-00000000a041', 10000, 'active',
   now() - interval '5 days', now(), '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000ca41', '00000000-0000-0000-0000-00000000a042', 5000, 'pending_review',
   now() - interval '1 day', NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca42', '00000000-0000-0000-0000-00000000a043', 7000, 'pending_review',
   now() - interval '2 days', NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca43', '00000000-0000-0000-0000-00000000a044', 9000, 'dismissed',
   now() - interval '4 days', now(), '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000ca44', '00000000-0000-0000-0000-00000000a045', 3000, 'active',
   now() - interval '3 days', now(), '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000ca44', '00000000-0000-0000-0000-00000000a046', 4000, 'active',
   now() - interval '2 days', now(), '00000000-0000-0000-0000-0000000000a1');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- ── delinquency_client_states ──────────────────────────────────────────────────
SELECT is(
  (SELECT state FROM public.delinquency_client_states(ARRAY['00000000-0000-0000-0000-00000000ca41']::uuid[])),
  'active', 'con una activa y una por revisar, gana la activa');

SELECT is(
  (SELECT pending FROM public.delinquency_client_states(ARRAY['00000000-0000-0000-0000-00000000ca41']::uuid[])),
  10000::bigint, 'el saldo es el de las morosidades de ese estado, no el de las por revisar');

SELECT is(
  (SELECT state FROM public.delinquency_client_states(ARRAY['00000000-0000-0000-0000-00000000ca42']::uuid[])),
  'pending_review', 'una clienta con solo una por revisar se devuelve como por revisar');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_client_states(ARRAY['00000000-0000-0000-0000-00000000ca43']::uuid[])),
  0, 'una descartada no se devuelve');

SELECT is(
  (SELECT pending FROM public.delinquency_client_states(ARRAY['00000000-0000-0000-0000-00000000ca44']::uuid[])),
  7000::bigint, 'con dos activas se suma lo que debe');

SELECT is(
  (SELECT since::date FROM public.delinquency_client_states(ARRAY['00000000-0000-0000-0000-00000000ca44']::uuid[])),
  (now() - interval '3 days')::date, 'since es cuándo se generó la más antigua');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_client_states(ARRAY[]::uuid[])),
  0, 'una lista vacía no devuelve filas');

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_client_states(
      ARRAY(SELECT gen_random_uuid() FROM generate_series(1, 201)))$$,
  '54000', 'delinquency_too_many_ids', 'más de 200 ids es un error');

-- ── delinquency_list_active ────────────────────────────────────────────────────
SELECT results_eq(
  $$SELECT client_id FROM public.delinquency_list_active(10, NULL)$$,
  $$VALUES ('00000000-0000-0000-0000-00000000ca44'::uuid), ('00000000-0000-0000-0000-00000000ca41'::uuid)$$,
  'el listado trae solo las activas, de la más reciente a la más antigua');

SELECT results_eq(
  $$SELECT client_id FROM public.delinquency_list_active(10, now() - interval '4 days')$$,
  $$VALUES ('00000000-0000-0000-0000-00000000ca41'::uuid)$$,
  'la página siguiente trae las generadas antes de la fecha dada');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_list_active(1, NULL)),
  1, 'el tope limita el listado');

-- ── Como la clienta ────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_client_states(ARRAY['00000000-0000-0000-0000-00000000ca41']::uuid[]))
  + (SELECT count(*)::int FROM public.delinquency_list_active(10, NULL)),
  0, 'la clienta no ve ni su propia morosidad por el contrato');

-- ── Como anon ──────────────────────────────────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_list_active(10, NULL)$$,
  '42501', NULL, 'anon no puede consultar el listado');

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_client_states(ARRAY[]::uuid[])$$,
  '42501', NULL, 'anon no puede consultar el estado de las clientas');

SELECT * FROM finish();
ROLLBACK;
