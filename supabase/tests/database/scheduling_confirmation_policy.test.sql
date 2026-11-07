-- US-NOT-08 · plazo de confirmación: solo se cambia por la función, que valida el tope y deja el evento.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000080ac2', 'plazo-client@test.local'),
  ('00000000-0000-0000-0000-000000080ac5', 'plazo-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000080ac5';

SELECT is((SELECT confirmation_deadline_hours FROM public.scheduling_confirmation_policy), 48,
  'el plazo arranca en 48 horas');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_confirmation_policy (singleton, confirmation_deadline_hours) VALUES (false, 24)$$,
  '23514', NULL, 'no admite una segunda fila');

SELECT throws_ok(
  $$UPDATE public.scheduling_confirmation_policy SET confirmation_deadline_hours = 721$$,
  '23514', NULL, 'la base rechaza más de 720 horas');

SELECT throws_ok(
  $$UPDATE public.scheduling_confirmation_policy SET confirmation_deadline_hours = -1$$,
  '23514', NULL, 'la base rechaza un plazo negativo');

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM public.scheduling_confirmation_policy$$,
  '42501', NULL, 'anon no lee el plazo');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000080ac2","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.scheduling_confirmation_policy), 0::bigint,
  'una clienta no lee el plazo');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_confirmation_deadline(24)$$,
  '42501', NULL, 'una clienta no cambia el plazo');

SELECT throws_ok(
  $$UPDATE public.scheduling_confirmation_policy SET confirmation_deadline_hours = 24$$,
  '42501', NULL, 'nadie cambia el plazo con un UPDATE directo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000080ac5","role":"authenticated"}', true);

SELECT is((SELECT confirmation_deadline_hours FROM public.scheduling_confirmation_policy), 48,
  'la administradora lee el plazo');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_confirmation_deadline(721)$$,
  'scheduling_invalid_confirmation_deadline', 'la función rechaza un plazo fuera de rango');

SELECT results_eq(
  $$SELECT * FROM public.scheduling_change_confirmation_deadline(24)$$,
  $$VALUES (48, 24)$$,
  'la administradora cambia el plazo y recibe el anterior y el nuevo');

RESET ROLE;

SELECT results_eq(
  $$SELECT actor_id, payload FROM public.audit_events
     WHERE action = 'scheduling.confirmation_deadline.changed'
       AND actor_id = '00000000-0000-0000-0000-000000080ac5'$$,
  $$VALUES ('00000000-0000-0000-0000-000000080ac5'::uuid, '{"newHours": 24, "previousHours": 48}'::jsonb)$$,
  'el cambio queda en la bitácora');

SET LOCAL ROLE authenticated;
SELECT scheduling_change_confirmation_deadline(24);
RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
    WHERE action = 'scheduling.confirmation_deadline.changed'
      AND actor_id = '00000000-0000-0000-0000-000000080ac5'),
  1, 'repetir el mismo valor no deja otro evento');

SELECT * FROM finish();
ROLLBACK;
