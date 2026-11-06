-- US-NOT-02 · el cron reclama los avisos a la clienta de a tandas, sin mandar el mismo dos veces.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000007a1', 'reclamo-aviso-admin@test.local'),
  ('00000000-0000-0000-0000-0000000007a2', 'reclamo-aviso-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000007a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000007c2', '00000000-0000-0000-0000-0000000007a2',
        'Clienta', 'reclamo-aviso-clienta@test.local', '+50688880095');

DELETE FROM public.notifications_client_notices;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-0000000007e1', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-10-07 15:00+00', '2047-10-07 16:00+00', tstzrange('2047-10-07 15:00+00', '2047-10-07 16:15+00'),
   '00000000-0000-0000-0000-0000000007c2', '00000000-0000-0000-0000-0000000007f1', 'zz-test reclamo',
   true, 35000, 10000, 10000);

INSERT INTO public.notifications_client_notices
  (id, kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at,
   status, claimed_at, created_at)
VALUES
  ('00000000-0000-0000-0000-0000000007d1', 'reschedule_rejected', gen_random_uuid(), '00000000-0000-0000-0000-0000000007e1',
   '00000000-0000-0000-0000-0000000007c2', 'A', '2047-10-14 15:00+00', '2047-10-07 15:00+00',
   'pending', NULL, '2047-10-01 10:00+00'),
  ('00000000-0000-0000-0000-0000000007d2', 'reschedule_expired', gen_random_uuid(), '00000000-0000-0000-0000-0000000007e1',
   '00000000-0000-0000-0000-0000000007c2', 'B', '2047-10-14 15:00+00', '2047-10-07 15:00+00',
   'pending', NULL, '2047-10-01 11:00+00'),
  ('00000000-0000-0000-0000-0000000007d3', 'reschedule_rejected', gen_random_uuid(), '00000000-0000-0000-0000-0000000007e1',
   '00000000-0000-0000-0000-0000000007c2', 'C', '2047-10-14 15:00+00', '2047-10-07 15:00+00',
   'claimed', '2047-10-01 11:55+00', '2047-10-01 09:00+00'),
  ('00000000-0000-0000-0000-0000000007d4', 'reschedule_rejected', gen_random_uuid(), '00000000-0000-0000-0000-0000000007e1',
   '00000000-0000-0000-0000-0000000007c2', 'D', '2047-10-14 15:00+00', '2047-10-07 15:00+00',
   'claimed', '2047-10-01 11:30+00', '2047-10-01 08:00+00'),
  ('00000000-0000-0000-0000-0000000007d5', 'reschedule_rejected', gen_random_uuid(), '00000000-0000-0000-0000-0000000007e1',
   '00000000-0000-0000-0000-0000000007c2', 'E', '2047-10-14 15:00+00', '2047-10-07 15:00+00',
   'sent', NULL, '2047-10-01 07:00+00');

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a2","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 10, 10)), 0,
  'una clienta no reclama avisos, ni los suyos');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 0, 10)$$,
  'P0001', NULL, 'una tanda de tamaño 0 se rechaza');

SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 10, 0)$$,
  'P0001', NULL, 'un plazo de reclamo de 0 minutos se rechaza');

SELECT results_eq(
  $$SELECT service_name FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 2, 10) ORDER BY 1$$,
  $$VALUES ('A'::text), ('D'::text)$$,
  'reclama de a tandas, los más viejos primero: un reclamo vencido vuelve a la fila y uno reciente no');

SELECT results_eq(
  $$SELECT status, claimed_at FROM public.notifications_client_notices WHERE id = '00000000-0000-0000-0000-0000000007d1'$$,
  $$VALUES ('claimed'::text, '2047-10-01 12:00+00'::timestamptz)$$,
  'lo reclamado queda claimed con la hora del reloj');

SELECT results_eq(
  $$SELECT service_name FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 10, 10)$$,
  $$VALUES ('B'::text)$$,
  'la corrida siguiente no vuelve a reclamar lo que ya está reclamado, ni lo enviado');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_claim_client_notices('2047-10-01 12:20+00', 10, 10)), 4,
  'pasado el plazo, un reclamo abandonado se vuelve a reclamar; lo enviado nunca');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 10, 10)$$,
  '42501', NULL, 'anon no puede reclamar');

SELECT * FROM finish();
ROLLBACK;
