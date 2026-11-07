-- US-NOT-08 · solicitudes de confirmación: acceso, contrato con scheduling y reclamo del cron.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(19);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000081b02', 'solicitud-clienta@test.local'),
  ('00000000-0000-0000-0000-000000081b05', 'solicitud-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000081b05';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-000000081bc6', '00000000-0000-0000-0000-000000081b02',
        'Clienta', 'solicitud-clienta@test.local', '+50688880811');

SELECT public.notifications_record_confirmation_request(
  '00000000-0000-0000-0000-00000008da01', '00000000-0000-0000-0000-000000081bc6',
  '2099-01-01 15:00:00+00', 'zz-test servicio');
SELECT public.notifications_record_confirmation_request(
  '00000000-0000-0000-0000-00000008da01', '00000000-0000-0000-0000-000000081bc6',
  '2099-01-01 15:00:00+00', 'zz-test servicio');

SELECT is(
  (SELECT count(*)::integer FROM public.notifications_confirmation_requests
    WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'),
  1, 'repetir la solicitud del mismo horario no crea otra');

UPDATE public.notifications_confirmation_requests SET status = 'sent'
 WHERE appointment_id = '00000000-0000-0000-0000-00000008da01';
SELECT public.notifications_record_confirmation_request(
  '00000000-0000-0000-0000-00000008da01', '00000000-0000-0000-0000-000000081bc6',
  '2099-01-01 15:00:00+00', 'zz-test servicio');

SELECT is(
  (SELECT status FROM public.notifications_confirmation_requests
    WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'),
  'sent', 'una solicitud ya enviada no se vuelve a mandar');

SELECT public.notifications_record_confirmation_request(
  '00000000-0000-0000-0000-00000008da01', '00000000-0000-0000-0000-000000081bc6',
  '2099-02-01 15:00:00+00', 'zz-test servicio');

SELECT is(
  (SELECT count(*)::integer FROM public.notifications_confirmation_requests
    WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'),
  2, 'otro horario de la misma cita es otra solicitud');

SELECT public.notifications_cancel_confirmation_request('00000000-0000-0000-0000-00000008da01');

SELECT results_eq(
  $$SELECT status FROM public.notifications_confirmation_requests
     WHERE appointment_id = '00000000-0000-0000-0000-00000008da01' ORDER BY starts_at$$,
  $$VALUES ('sent'), ('cancelled')$$,
  'cancelar solo toca lo que no se mandó');

SELECT public.notifications_record_confirmation_request(
  '00000000-0000-0000-0000-00000008da01', '00000000-0000-0000-0000-000000081bc6',
  '2099-02-01 15:00:00+00', 'zz-test servicio');

SELECT is(
  (SELECT status FROM public.notifications_confirmation_requests
    WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'
      AND starts_at = '2099-02-01 15:00:00+00'),
  'pending', 'una solicitud cancelada del mismo horario vuelve a quedar pendiente');

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM public.notifications_confirmation_requests$$,
  '42501', NULL, 'anon no lee las solicitudes');
SELECT throws_ok(
  $$SELECT public.notifications_record_confirmation_request(gen_random_uuid(), gen_random_uuid(), now(), 'x')$$,
  '42501', NULL, 'anon no fabrica solicitudes');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000081b02","role":"authenticated"}', true);

SELECT is((SELECT count(*)::integer FROM public.notifications_confirmation_requests), 0,
  'una clienta no lee las solicitudes, ni las suyas');
SELECT is_empty(
  $$UPDATE public.notifications_confirmation_requests SET status = 'sent' RETURNING id$$,
  'una clienta no cambia las solicitudes');
SELECT throws_ok(
  $$SELECT public.notifications_record_confirmation_request(gen_random_uuid(), gen_random_uuid(), now(), 'x')$$,
  '42501', NULL, 'una clienta no fabrica solicitudes');
SELECT throws_ok(
  $$SELECT public.notifications_cancel_confirmation_request('00000000-0000-0000-0000-00000008da01')$$,
  '42501', NULL, 'una clienta no cancela solicitudes');
SELECT throws_ok(
  $$INSERT INTO public.notifications_confirmation_requests (appointment_id, client_id, starts_at, service_name)
    VALUES (gen_random_uuid(), gen_random_uuid(), now(), 'x')$$,
  '42501', NULL, 'nadie inserta directo');
SELECT is_empty(
  $$SELECT * FROM public.notifications_claim_confirmation_requests('2098-12-01 00:00:00+00', 10, 10)$$,
  'una clienta no reclama solicitudes');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000081b05","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::integer FROM public.notifications_confirmation_requests
    WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'),
  2, 'el staff lee las solicitudes');

SELECT results_eq(
  $$SELECT status FROM public.notifications_claim_confirmation_requests('2098-12-01 00:00:00+00', 10, 10)
     WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'$$,
  $$VALUES ('claimed')$$,
  'el staff reclama lo pendiente y no lo ya enviado');

SELECT is_empty(
  $$SELECT id FROM public.notifications_claim_confirmation_requests('2098-12-01 00:05:00+00', 10, 10)
     WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'$$,
  'lo recién reclamado no se reclama otra vez');

SELECT results_eq(
  $$SELECT status FROM public.notifications_claim_confirmation_requests('2098-12-01 00:30:00+00', 10, 10)
     WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'$$,
  $$VALUES ('claimed')$$,
  'se retoma lo reclamado por una corrida que murió');

SELECT is_empty(
  $$SELECT id FROM public.notifications_claim_confirmation_requests('2099-03-01 00:00:00+00', 10, 10)
     WHERE appointment_id = '00000000-0000-0000-0000-00000008da01'$$,
  'no se reclama la solicitud de una cita que ya empezó');

SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_confirmation_requests(now(), 0, 10)$$,
  'P0001', NULL, 'una tanda inválida no reclama nada');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
