-- US-NOT-02 · avisos a la clienta cuando su reagendado se rechaza o vence: cada clienta ve los suyos.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005a1', 'aviso-clienta-admin@test.local'),
  ('00000000-0000-0000-0000-0000000005a2', 'aviso-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000005a3', 'aviso-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-0000000005a2',
   'Clienta A', 'aviso-clienta-a@test.local', '+50688880092'),
  ('00000000-0000-0000-0000-0000000005c3', '00000000-0000-0000-0000-0000000005a3',
   'Clienta B', 'aviso-clienta-b@test.local', '+50688880093');

SELECT public.notifications_record_reschedule_outcome(
  '00000000-0000-0000-0000-00000000e501', 'reschedule_rejected', '00000000-0000-0000-0000-00000000c501',
  '00000000-0000-0000-0000-0000000005c2', 'Lifting de pestañas', '2047-10-07 15:00+00', '2047-09-30 15:00+00');
SELECT public.notifications_record_reschedule_outcome(
  '00000000-0000-0000-0000-00000000e501', 'reschedule_rejected', '00000000-0000-0000-0000-00000000c501',
  '00000000-0000-0000-0000-0000000005c2', 'Lifting de pestañas', '2047-10-07 15:00+00', '2047-09-30 15:00+00');
SELECT public.notifications_record_reschedule_outcome(
  '00000000-0000-0000-0000-00000000e502', 'reschedule_expired', '00000000-0000-0000-0000-00000000c502',
  '00000000-0000-0000-0000-0000000005c3', 'Extensiones', '2047-10-08 15:00+00', '2047-10-01 15:00+00');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices WHERE event_id = '00000000-0000-0000-0000-00000000e501'),
  1, 'registrar dos veces el mismo evento deja un solo aviso');

SELECT results_eq(
  $$SELECT status, attempts FROM public.notifications_client_notices WHERE event_id = '00000000-0000-0000-0000-00000000e501'$$,
  $$VALUES ('pending'::text, 0)$$,
  'el aviso nace pendiente de enviar, sin intentos');

SELECT throws_ok(
  $$SELECT public.notifications_record_reschedule_outcome(gen_random_uuid(), 'otro', gen_random_uuid(),
      gen_random_uuid(), 'X', now(), now())$$,
  '23514', NULL, 'un tipo de aviso desconocido se rechaza');

SELECT public.notifications_record_reschedule_outcome(
  '00000000-0000-0000-0000-00000000e503', 'reschedule_rejected', '00000000-0000-0000-0000-00000000c503',
  '00000000-0000-0000-0000-0000000005c3', 'Extensiones', '2047-10-09 15:00+00', '2047-10-02 15:00+00');
SELECT public.notifications_record_reschedule_outcome(
  '00000000-0000-0000-0000-00000000e504', 'reschedule_expired', '00000000-0000-0000-0000-00000000c503',
  '00000000-0000-0000-0000-0000000005c3', 'Extensiones', '2047-10-09 15:00+00', '2047-10-02 15:00+00');
SELECT is(
  (SELECT string_agg(kind, ',') FROM public.notifications_client_notices
    WHERE appointment_id = '00000000-0000-0000-0000-00000000c503'),
  'reschedule_expired',
  'vencer rechaza la cita en la misma transacción: queda un solo aviso, el de vencido');

UPDATE public.notifications_client_notices SET created_at = now() - interval '1 day'
 WHERE event_id = '00000000-0000-0000-0000-00000000e501';
SELECT public.notifications_record_reschedule_outcome(
  '00000000-0000-0000-0000-00000000e505', 'reschedule_expired', '00000000-0000-0000-0000-00000000c501',
  '00000000-0000-0000-0000-0000000005c2', 'Lifting de pestañas', '2047-10-21 15:00+00', '2047-09-30 15:00+00');
SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices
    WHERE appointment_id = '00000000-0000-0000-0000-00000000c501'),
  2, 'un rechazo de antes, de otra transacción, no se borra');
DELETE FROM public.notifications_client_notices WHERE event_id = '00000000-0000-0000-0000-00000000e505';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT kind, service_name, requested_starts_at, kept_starts_at FROM public.notifications_client_notices$$,
  $$VALUES ('reschedule_rejected'::text, 'Lifting de pestañas'::text,
            '2047-10-07 15:00+00'::timestamptz, '2047-09-30 15:00+00'::timestamptz)$$,
  'clienta A: ve solo su aviso, con el horario pedido y el que conserva');

UPDATE public.notifications_client_notices SET status = 'sent';
SELECT is(
  (SELECT status FROM public.notifications_client_notices WHERE event_id = '00000000-0000-0000-0000-00000000e501'),
  'pending', 'clienta A: no puede marcar su aviso como enviado');

SELECT throws_ok(
  $$SELECT public.notifications_record_reschedule_outcome(gen_random_uuid(), 'reschedule_rejected', gen_random_uuid(),
      '00000000-0000-0000-0000-0000000005c2', 'X', now(), now())$$,
  '42501', NULL, 'clienta A: no fabrica avisos por la función');

SELECT throws_ok(
  $$INSERT INTO public.notifications_client_notices
      (kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at)
    VALUES ('reschedule_rejected', gen_random_uuid(), gen_random_uuid(), '00000000-0000-0000-0000-0000000005c2', 'X', now(), now())$$,
  '42501', NULL, 'clienta A: no inserta avisos directo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a3","role":"authenticated"}', true);
SELECT results_eq(
  $$SELECT count(*)::int, bool_and(client_id = '00000000-0000-0000-0000-0000000005c3') FROM public.notifications_client_notices$$,
  $$VALUES (2, true)$$,
  'clienta B: ve solo los suyos, nunca el de la clienta A');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a1","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices
    WHERE event_id IN ('00000000-0000-0000-0000-00000000e501', '00000000-0000-0000-0000-00000000e502')),
  2, 'staff: ve los avisos de todas las clientas');

UPDATE public.notifications_client_notices SET status = 'sent', last_channel = 'whatsapp', sent_at = now()
 WHERE event_id = '00000000-0000-0000-0000-00000000e501';
SELECT is(
  (SELECT status || ' · ' || last_channel FROM public.notifications_client_notices
    WHERE event_id = '00000000-0000-0000-0000-00000000e501'),
  'sent · whatsapp', 'staff (el cron): marca el envío');

SELECT throws_ok(
  $$UPDATE public.notifications_client_notices SET kept_starts_at = now() WHERE event_id = '00000000-0000-0000-0000-00000000e501'$$,
  '42501', NULL, 'staff: no cambia el contenido del aviso, solo su envío');

SELECT throws_ok(
  $$DELETE FROM public.notifications_client_notices$$,
  '42501', NULL, 'staff: no borra avisos');

SELECT throws_ok(
  $$SELECT public.notifications_record_reschedule_outcome(gen_random_uuid(), 'reschedule_rejected', gen_random_uuid(),
      gen_random_uuid(), 'X', now(), now())$$,
  '42501', NULL, 'staff: no fabrica avisos por la función');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT count(*) FROM public.notifications_client_notices$$,
  '42501', NULL, 'anon: no lee avisos');

SELECT * FROM finish();
ROLLBACK;
