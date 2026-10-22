-- US-AGE-06 · ventana de cancelación, editable sin migración.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000ac2', 'policy-client@test.local'),
  ('00000000-0000-0000-0000-000000000ac5', 'policy-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000ac5';

SELECT is((SELECT count(*) FROM public.scheduling_cancellation_policy), 1::bigint,
  'la política es una sola fila');

SELECT is((SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy), 48,
  'la ventana arranca en 48 horas');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_cancellation_policy (singleton, cancellation_window_hours) VALUES (false, 24)$$,
  '23514', NULL, 'no admite una segunda fila');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000ac2","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.scheduling_cancellation_policy), 0::bigint,
  'una clienta no lee la tabla de la política');

UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 1;

RESET ROLE;

SELECT is((SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy), 48,
  'una clienta no puede cambiar la ventana');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000ac5","role":"authenticated"}', true);

UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 24;

SELECT is((SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy), 24,
  'la administradora cambia la ventana con un UPDATE, sin migración');

SELECT throws_ok(
  $$UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = -1$$,
  '23514', NULL, 'la ventana no puede ser negativa');

UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 0;

SELECT is((SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy), 0,
  'cero es válido: sin ventana');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancellation_policy$$,
  '42501', NULL, 'un anónimo no lee la tabla de la política');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
