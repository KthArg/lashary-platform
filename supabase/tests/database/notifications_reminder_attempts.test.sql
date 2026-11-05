BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000007a1', 'staff-admin-not07@test.local'),
  ('00000000-0000-0000-0000-0000000007c1', 'clienta-not07@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000007a1';

INSERT INTO public.notifications_reminders
  (id, appointment_id, client_id, starts_at, technique_name, send_at)
VALUES
  ('00000000-0000-0000-0000-00000000f701', '00000000-0000-0000-0000-00000000a701',
   '00000000-0000-0000-0000-0000000007c1', now() + interval '2 days', 'zz-test tecnica',
   now() + interval '1 day');

INSERT INTO public.notifications_reminder_attempts
  (id, reminder_id, attempt_number, channel, outcome, error, attempted_at)
VALUES
  ('00000000-0000-0000-0000-00000000e701', '00000000-0000-0000-0000-00000000f701', 1,
   'whatsapp', 'failed', 'fallo sembrado', now());

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reminder_attempts),
  1, 'staff: SELECT ve el intento');

SELECT lives_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, channel, outcome, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f701', 1, 'email', 'sent', now())$$,
  'staff: registra un envío exitoso sin error');

SELECT lives_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, outcome, error, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f701', 2, 'no_contact', 'sin contacto', now())$$,
  'staff: registra un intento sin contacto y sin canal');

SELECT throws_ok(
  $$UPDATE public.notifications_reminder_attempts SET error = 'alterado'$$,
  '42501', NULL, 'staff: UPDATE denegado, la bitácora no se reescribe');

SELECT throws_ok(
  $$DELETE FROM public.notifications_reminder_attempts$$,
  '42501', NULL, 'staff: DELETE denegado, la bitácora no se borra');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, channel, outcome, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f701', 1, 'email', 'failed', now())$$,
  '23514', NULL, 'un fallo sin error se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, channel, outcome, error, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f701', 1, 'email', 'sent', 'contradice', now())$$,
  '23514', NULL, 'un envío exitoso con error se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, channel, outcome, error, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f701', 1, 'email', 'no_contact', 'sin contacto', now())$$,
  '23514', NULL, 'sin contacto no lleva canal');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, channel, outcome, error, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f701', 1, NULL, 'failed', 'sin canal', now())$$,
  '23514', NULL, 'un fallo de envío exige canal');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, channel, outcome, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f799', 1, 'email', 'sent', now())$$,
  '23503', NULL, 'un intento exige un recordatorio existente');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reminder_attempts),
  0, 'clienta: no ve los intentos de su propio recordatorio');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, channel, outcome, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f701', 1, 'email', 'sent', now())$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT count(*) FROM public.notifications_reminder_attempts$$,
  '42501', NULL, 'anon: SELECT denegado');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminder_attempts
      (reminder_id, attempt_number, channel, outcome, attempted_at)
    VALUES ('00000000-0000-0000-0000-00000000f701', 1, 'email', 'sent', now())$$,
  '42501', NULL, 'anon: INSERT denegado');

SELECT * FROM finish();
ROLLBACK;
