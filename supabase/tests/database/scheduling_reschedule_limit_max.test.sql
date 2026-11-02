-- US-AGE-10 · el PO fijó en 3 el máximo del tope de reagendados por cita.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000d15', 'reschedule-max-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000d15';

SELECT lives_ok(
  $$UPDATE public.scheduling_reschedule_policy SET max_reschedules = 3$$,
  'la base acepta 3 como tope');

SELECT throws_ok(
  $$UPDATE public.scheduling_reschedule_policy SET max_reschedules = 4$$,
  '23514', NULL, 'la base rechaza 4, venga de donde venga');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d15","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT new_max FROM public.scheduling_change_reschedule_limit(3)$$,
  $$VALUES (3)$$,
  'la función acepta 3');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(4)$$,
  'P0001', 'scheduling_invalid_reschedule_limit', 'la función rechaza 4');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(10)$$,
  'P0001', 'scheduling_invalid_reschedule_limit', 'y el 10 de antes también');

SELECT results_eq(
  $$SELECT new_max FROM public.scheduling_change_reschedule_limit(0)$$,
  $$VALUES (0)$$,
  'cero sigue siendo válido: reagendar desactivado');

RESET ROLE;

SELECT is((SELECT max_reschedules FROM public.scheduling_reschedule_policy), 0,
  'el tope quedó en lo último que se guardó');

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(2)$$,
  '42501', NULL, 'un anónimo sigue sin ejecutar la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
