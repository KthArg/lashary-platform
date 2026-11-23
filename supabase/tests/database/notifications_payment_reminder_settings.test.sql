BEGIN;
SELECT plan(7);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'pay-settings-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'pay-settings-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f1';

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT frequency_days FROM public.notifications_payment_reminder_settings),
  7, 'la frecuencia arranca en 7 días, valor propuesto');

SELECT throws_ok(
  $$UPDATE public.notifications_payment_reminder_settings SET frequency_days = 14$$,
  '42501', NULL, 'ni la administradora cambia la frecuencia directo: va por la función, que deja bitácora');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.notifications_payment_reminder_settings),
  0, 'la clienta no ve la configuración: la RLS la oculta');

SELECT throws_ok(
  $$UPDATE public.notifications_payment_reminder_settings SET frequency_days = 30$$,
  '42501', NULL, 'la clienta no puede cambiar la frecuencia');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT frequency_days FROM public.notifications_payment_reminder_settings),
  7, 'la frecuencia sigue en 7: nadie la cambió directo');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.notifications_payment_reminder_settings$$,
  '42501', NULL, 'anon: no lee la configuración');

RESET ROLE;
SELECT throws_ok(
  $$UPDATE public.notifications_payment_reminder_settings SET frequency_days = 31$$,
  '23514', NULL, 'el rango 1-30 se aplica aunque se escriba como dueño');

SELECT * FROM finish();
ROLLBACK;
