BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000a4', 'staff-admin-not04@test.local'),
  ('00000000-0000-0000-0000-0000000000c4', 'clienta-not04@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a4';

INSERT INTO public.notifications_payment_reminders (client_id, last_sent_at, last_amount, last_channel)
VALUES ('00000000-0000-0000-0000-0000000000c4', '2026-11-10 17:00:00+00', 18000, 'whatsapp');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_payment_reminders
    WHERE client_id = '00000000-0000-0000-0000-0000000000c4'),
  1, 'staff: SELECT ve la fila');

SELECT lives_ok(
  $$INSERT INTO public.notifications_payment_reminders (client_id, last_sent_at, last_amount, last_channel)
    VALUES ('00000000-0000-0000-0000-0000000000d4', '2026-11-11 17:00:00+00', 5000, 'email')$$,
  'staff: INSERT permitido');

SELECT lives_ok(
  $$INSERT INTO public.notifications_payment_reminders AS r (client_id, last_sent_at, last_amount, last_channel)
    VALUES ('00000000-0000-0000-0000-0000000000c4', '2026-11-17 17:00:00+00', 9000, 'email')
    ON CONFLICT (client_id) DO UPDATE
      SET last_sent_at = EXCLUDED.last_sent_at, last_amount = EXCLUDED.last_amount,
          last_channel = EXCLUDED.last_channel, send_count = r.send_count + 1, updated_at = now()$$,
  'staff: el upsert del siguiente envío actualiza la fila de la clienta');

SELECT results_eq(
  $$SELECT last_amount, last_channel, send_count FROM public.notifications_payment_reminders
     WHERE client_id = '00000000-0000-0000-0000-0000000000c4'$$,
  $$VALUES (9000::bigint, 'email'::text, 2)$$,
  'staff: sigue una sola fila por clienta, con el último envío y la cuenta de envíos');

SELECT throws_like(
  $$INSERT INTO public.notifications_payment_reminders (client_id, last_sent_at, last_amount, last_channel)
    VALUES ('00000000-0000-0000-0000-0000000000c4', now(), 1000, 'whatsapp')$$,
  '%notifications_payment_reminders_pkey%',
  'una segunda fila para la misma clienta viola la clave primaria');

SELECT throws_like(
  $$INSERT INTO public.notifications_payment_reminders (client_id, last_sent_at, last_amount, last_channel)
    VALUES ('00000000-0000-0000-0000-0000000000e4', now(), 0, 'whatsapp')$$,
  '%last_amount%',
  'el monto recordado debe ser mayor que cero');

SELECT throws_like(
  $$INSERT INTO public.notifications_payment_reminders (client_id, last_sent_at, last_amount, last_channel)
    VALUES ('00000000-0000-0000-0000-0000000000e4', now(), 1000, 'sms')$$,
  '%last_channel%',
  'el canal solo puede ser whatsapp o email');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_payment_reminders),
  0, 'clienta: SELECT no ve ninguna fila');

SELECT throws_ok(
  $$INSERT INTO public.notifications_payment_reminders (client_id, last_sent_at, last_amount, last_channel)
    VALUES ('00000000-0000-0000-0000-0000000000f4', now(), 1000, 'whatsapp')$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.notifications_payment_reminders$$,
  '42501', NULL, 'anon: sin permiso sobre la tabla');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_payment_reminders),
  2, 'staff: solo existen las dos filas sembradas por staff y el superusuario');

SELECT * FROM finish();
ROLLBACK;
