BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'allstates-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'allstates-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000b1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cb41', '00000000-0000-0000-0000-0000000000b2', 'Activa y por revisar', 'cb41@test.local', '00000000061'),
  ('00000000-0000-0000-0000-00000000cb42', NULL, 'Solo por revisar', 'cb42@test.local', '00000000062'),
  ('00000000-0000-0000-0000-00000000cb43', NULL, 'Solo descartada', 'cb43@test.local', '00000000063'),
  ('00000000-0000-0000-0000-00000000cb44', NULL, 'Dos activas', 'cb44@test.local', '00000000064'),
  ('00000000-0000-0000-0000-00000000cb45', NULL, 'Sin morosidad', 'cb45@test.local', '00000000065');

INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-00000000cb41', '00000000-0000-0000-0000-00000000b041', 10000, 'active',
   now() - interval '5 days', now(), '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000cb41', '00000000-0000-0000-0000-00000000b042', 5000, 'pending_review',
   now() - interval '1 day', NULL, NULL),
  ('00000000-0000-0000-0000-00000000cb42', '00000000-0000-0000-0000-00000000b043', 7000, 'pending_review',
   now() - interval '2 days', NULL, NULL),
  ('00000000-0000-0000-0000-00000000cb43', '00000000-0000-0000-0000-00000000b044', 9000, 'dismissed',
   now() - interval '4 days', now(), '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000cb44', '00000000-0000-0000-0000-00000000b045', 3000, 'active',
   now() - interval '3 days', now(), '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000cb44', '00000000-0000-0000-0000-00000000b046', 4000, 'active',
   now() - interval '2 days', now(), '00000000-0000-0000-0000-0000000000b1');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT state FROM public.delinquency_all_client_states()
    WHERE client_id = '00000000-0000-0000-0000-00000000cb41'),
  'active', 'con una activa y una por revisar, gana la activa');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_all_client_states()
    WHERE client_id = '00000000-0000-0000-0000-00000000cb41'),
  1, 'una clienta con dos morosidades sale en una sola fila');

SELECT is(
  (SELECT state FROM public.delinquency_all_client_states()
    WHERE client_id = '00000000-0000-0000-0000-00000000cb42'),
  'pending_review', 'una clienta con solo una por revisar sale como por revisar');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_all_client_states()
    WHERE client_id = '00000000-0000-0000-0000-00000000cb44'),
  1, 'dos activas de la misma clienta salen en una sola fila');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_all_client_states()
    WHERE client_id = '00000000-0000-0000-0000-00000000cb43'),
  0, 'una descartada no sale');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_all_client_states()
    WHERE client_id = '00000000-0000-0000-0000-00000000cb45'),
  0, 'una clienta sin morosidad no sale');

SELECT set_eq(
  $$SELECT client_id FROM public.delinquency_all_client_states()
     WHERE client_id::text LIKE '00000000-0000-0000-0000-00000000cb4%'$$,
  $$VALUES ('00000000-0000-0000-0000-00000000cb41'::uuid),
           ('00000000-0000-0000-0000-00000000cb42'::uuid),
           ('00000000-0000-0000-0000-00000000cb44'::uuid)$$,
  'el personal ve a todas las que tienen morosidad no descartada');

SELECT set_eq(
  $$SELECT client_id, state FROM public.delinquency_all_client_states()
     WHERE client_id::text LIKE '00000000-0000-0000-0000-00000000cb4%'$$,
  $$SELECT client_id, state FROM public.delinquency_client_states(ARRAY[
      '00000000-0000-0000-0000-00000000cb41',
      '00000000-0000-0000-0000-00000000cb42',
      '00000000-0000-0000-0000-00000000cb43',
      '00000000-0000-0000-0000-00000000cb44',
      '00000000-0000-0000-0000-00000000cb45']::uuid[])$$,
  'da el mismo estado por clienta que delinquency_client_states, la que dibuja la columna');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_all_client_states()),
  0, 'la clienta no ve ni su propia morosidad');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_all_client_states()$$,
  '42501', NULL, 'anon no puede ejecutarla');

SELECT * FROM finish();
ROLLBACK;
