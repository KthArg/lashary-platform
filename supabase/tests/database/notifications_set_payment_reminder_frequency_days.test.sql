BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f3', 'pay-frequency-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f4', 'pay-frequency-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f3';

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  public.notifications_set_payment_reminder_frequency_days(14),
  14, 'la administradora cambia la frecuencia y la función devuelve el valor que quedó');

SELECT is(
  (SELECT frequency_days FROM public.notifications_payment_reminder_settings),
  14, 'la frecuencia quedó en 14 días');

SELECT results_eq(
  $$SELECT actor_id, entity_type, payload FROM public.audit_events
     WHERE action = 'notifications.settings.payment_reminder_frequency_days_changed'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000f3'::uuid, 'notifications_payment_reminder_settings'::text,
            '{"frequencyDays": 14, "previousFrequencyDays": 7}'::jsonb)$$,
  'el cambio deja su evento en la bitácora con quién, el valor anterior y el nuevo');

SELECT is(
  (SELECT entity_id FROM public.audit_events WHERE action = 'notifications.settings.payment_reminder_frequency_days_changed'),
  (SELECT id FROM public.notifications_payment_reminder_settings),
  'el evento queda sobre la configuración');

SELECT is(
  public.notifications_set_payment_reminder_frequency_days(14),
  14, 'poner el mismo valor devuelve el valor');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events WHERE action = 'notifications.settings.payment_reminder_frequency_days_changed'),
  1, 'y no deja otro evento: no cambió nada');

SELECT lives_ok($$SELECT public.notifications_set_payment_reminder_frequency_days(1)$$, 'la frecuencia puede bajar a 1 día');
SELECT lives_ok($$SELECT public.notifications_set_payment_reminder_frequency_days(30)$$, 'y subir a 30 días');

SELECT throws_ok(
  $$SELECT public.notifications_set_payment_reminder_frequency_days(0)$$,
  '22023', 'notifications_invalid_payment_reminder_frequency_days', 'la frecuencia no baja de 1 día');

SELECT throws_ok(
  $$SELECT public.notifications_set_payment_reminder_frequency_days(31)$$,
  '22023', 'notifications_invalid_payment_reminder_frequency_days', 'la frecuencia no pasa de 30 días');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f4","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.notifications_set_payment_reminder_frequency_days(21)$$,
  '42501', 'notifications_not_admin', 'la clienta no puede cambiar la frecuencia');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.notifications_set_payment_reminder_frequency_days(21)$$,
  '42501', NULL, 'anon no tiene permiso para llamar la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
