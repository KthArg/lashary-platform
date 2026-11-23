BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000a5', 'staff-admin-not04-fallos@test.local'),
  ('00000000-0000-0000-0000-0000000000c5', 'clienta-not04-fallos@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a5';

INSERT INTO public.notifications_payment_reminder_failures (client_id, attempt_day, last_error, last_failed_at)
VALUES ('00000000-0000-0000-0000-0000000000c5', '2026-11-19', 'whatsapp: timeout', '2026-11-19 17:00:00+00');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_payment_reminder_failures
    WHERE client_id = '00000000-0000-0000-0000-0000000000c5'),
  1, 'staff: SELECT ve la fila');

SELECT lives_ok(
  $$INSERT INTO public.notifications_payment_reminder_failures (client_id, attempt_day, last_error, last_failed_at)
    VALUES ('00000000-0000-0000-0000-0000000000d5', '2026-11-19', 'email: rechazado', '2026-11-19 17:05:00+00')$$,
  'staff: INSERT permitido');

SELECT lives_ok(
  $$INSERT INTO public.notifications_payment_reminder_failures AS failure (client_id, attempt_day, last_error, last_failed_at)
    VALUES ('00000000-0000-0000-0000-0000000000c5', '2026-11-19', 'whatsapp: timeout otra vez', '2026-11-19 17:15:00+00')
    ON CONFLICT (client_id) DO UPDATE
      SET attempts = failure.attempts + 1, last_error = EXCLUDED.last_error,
          last_failed_at = EXCLUDED.last_failed_at, updated_at = now()$$,
  'staff: el upsert del siguiente fallo del mismo día suma un intento');

SELECT results_eq(
  $$SELECT attempts, last_error FROM public.notifications_payment_reminder_failures
     WHERE client_id = '00000000-0000-0000-0000-0000000000c5'$$,
  $$VALUES (2, 'whatsapp: timeout otra vez'::text)$$,
  'staff: sigue una sola fila por clienta, con los intentos y el último error');

SELECT lives_ok(
  $$DELETE FROM public.notifications_payment_reminder_failures
     WHERE client_id = '00000000-0000-0000-0000-0000000000d5'$$,
  'staff: DELETE permitido, para limpiar los fallos de una clienta que ya recibió el aviso');

SELECT throws_like(
  $$INSERT INTO public.notifications_payment_reminder_failures (client_id, attempt_day, last_error, last_failed_at)
    VALUES ('00000000-0000-0000-0000-0000000000c5', '2026-11-19', 'otra', now())$$,
  '%notifications_payment_reminder_failures_pkey%',
  'una segunda fila para la misma clienta viola la clave primaria');

SELECT throws_like(
  $$INSERT INTO public.notifications_payment_reminder_failures (client_id, attempt_day, attempts, last_error, last_failed_at)
    VALUES ('00000000-0000-0000-0000-0000000000e5', '2026-11-19', 0, 'x', now())$$,
  '%attempts%',
  'los intentos son al menos uno');

SELECT throws_like(
  $$INSERT INTO public.notifications_payment_reminder_failures (client_id, attempt_day, last_error, last_failed_at)
    VALUES ('00000000-0000-0000-0000-0000000000e5', '2026-11-19', repeat('x', 502), now())$$,
  '%last_error%',
  'el error guardado no pasa de 501 caracteres (500 más el «…» de truncado)');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_payment_reminder_failures),
  0, 'clienta: SELECT no ve ninguna fila');

SELECT throws_ok(
  $$INSERT INTO public.notifications_payment_reminder_failures (client_id, attempt_day, last_error, last_failed_at)
    VALUES ('00000000-0000-0000-0000-0000000000f5', '2026-11-19', 'x', now())$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.notifications_payment_reminder_failures$$,
  '42501', NULL, 'anon: sin permiso sobre la tabla');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_payment_reminder_failures),
  1, 'staff: solo queda la fila de la clienta tras borrar la otra');

SELECT * FROM finish();
ROLLBACK;
