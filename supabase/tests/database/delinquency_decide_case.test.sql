-- delinquency_decide_case.test.sql
-- US-MOR-01 · feature delinquency — confirmar o descartar una morosidad por revisar (criterio 3, DOM-012).
-- Confirmar la deja activa y descartar la deja descartada, con quién y cuándo; solo se decide una
-- morosidad por revisar; deja su evento en la bitácora; solo admin la llama (SEC-001, SEC-002).
-- Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'decide-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'decide-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000b1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cb01', '00000000-0000-0000-0000-0000000000b2',
   'Clienta morosa', 'decide-clienta@test.local', '00000000040');

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending)
VALUES
  ('00000000-0000-0000-0000-00000000dc01', '00000000-0000-0000-0000-00000000cb01',
   '00000000-0000-0000-0000-00000000ab01', 20000),
  ('00000000-0000-0000-0000-00000000dc02', '00000000-0000-0000-0000-00000000cb01',
   '00000000-0000-0000-0000-00000000ab02', 10000);

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- ── Confirmar ──────────────────────────────────────────────────────────────────
SELECT is(
  (SELECT state FROM public.delinquency_decide_case('00000000-0000-0000-0000-00000000dc01', 'confirm')),
  'active', 'confirmar deja la morosidad activa');

SELECT results_eq(
  $$SELECT decided_by, decided_at IS NOT NULL FROM public.delinquency_cases
     WHERE id = '00000000-0000-0000-0000-00000000dc01'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000b1'::uuid, true)$$,
  'queda quién la confirmó y cuándo, sacado de la sesión');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE action = 'delinquency.case.confirmed'
      AND entity_id = '00000000-0000-0000-0000-00000000dc01'),
  1, 'confirmar deja su evento en la bitácora');

-- ── Descartar ──────────────────────────────────────────────────────────────────
SELECT is(
  (SELECT state FROM public.delinquency_decide_case('00000000-0000-0000-0000-00000000dc02', 'dismiss')),
  'dismissed', 'descartar deja la morosidad descartada');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE action = 'delinquency.case.dismissed'
      AND entity_id = '00000000-0000-0000-0000-00000000dc02'),
  1, 'descartar deja su evento en la bitácora');

-- ── Errores ────────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.delinquency_decide_case('00000000-0000-0000-0000-00000000dc01', 'dismiss')$$,
  '55000', 'delinquency_case_already_decided', 'una morosidad ya decidida no se decide otra vez');

SELECT throws_ok(
  $$SELECT public.delinquency_decide_case('00000000-0000-0000-0000-00000000dc99', 'confirm')$$,
  'P0002', 'delinquency_case_not_found', 'una morosidad que no existe es un error');

SELECT throws_ok(
  $$SELECT public.delinquency_decide_case('00000000-0000-0000-0000-00000000dc01', 'perdonar')$$,
  '22023', 'delinquency_invalid_decision', 'una decisión desconocida es un error');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events WHERE entity_type = 'delinquency_case'),
  2, 'los intentos fallidos no dejan eventos en la bitácora');

-- ── Quién la llama ─────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.delinquency_decide_case('00000000-0000-0000-0000-00000000dc01', 'confirm')$$,
  '42501', 'delinquency_not_admin', 'la clienta no puede decidir una morosidad, ni la suya');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.delinquency_decide_case('00000000-0000-0000-0000-00000000dc01', 'confirm')$$,
  '42501', NULL, 'anon no puede decidir una morosidad');

SELECT * FROM finish();
ROLLBACK;
