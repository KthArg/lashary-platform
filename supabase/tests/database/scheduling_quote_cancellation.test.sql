-- US-AGE-06 · lo que se le muestra a la clienta antes de cancelar, sin escribir nada.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000c02', 'quote-cancel-a@test.local'),
  ('00000000-0000-0000-0000-000000000c03', 'quote-cancel-b@test.local'),
  ('00000000-0000-0000-0000-000000000c05', 'quote-cancel-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000c05';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000000cc6', '00000000-0000-0000-0000-000000000c02',
   'Clienta A', 'quote-cancel-a@test.local', '+50688880056'),
  ('00000000-0000-0000-0000-000000000cc7', '00000000-0000-0000-0000-000000000c03',
   'Clienta B', 'quote-cancel-b@test.local', '+50688880057');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2027-09-10 15:00+00', '2027-09-10 16:00+00', tstzrange('2027-09-10 15:00+00', '2027-09-10 16:00+00'),
   '00000000-0000-0000-0000-000000000cc6', '00000000-0000-0000-0000-000000000cf4', 'zz-test cotizar',
   true, 35000, 10000),
  ('00000000-0000-0000-0000-00000000cd02', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '10 hours', now() + interval '11 hours',
   tstzrange(now() + interval '10 hours', now() + interval '11 hours'),
   '00000000-0000-0000-0000-000000000cc6', '00000000-0000-0000-0000-000000000cf4', 'zz-test cotizar',
   true, 35000, 10000),
  ('00000000-0000-0000-0000-00000000cd03', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() + interval '13 hours', now() + interval '14 hours',
   tstzrange(now() + interval '13 hours', now() + interval '14 hours'),
   '00000000-0000-0000-0000-000000000cc6', '00000000-0000-0000-0000-000000000cf4', 'zz-test cotizar',
   true, 35000, 10000),
  ('00000000-0000-0000-0000-00000000cd04', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2027-09-11 15:00+00', '2027-09-11 16:00+00', tstzrange('2027-09-11 15:00+00', '2027-09-11 16:00+00'),
   '00000000-0000-0000-0000-000000000cc7', '00000000-0000-0000-0000-000000000cf4', 'zz-test cotizar',
   true, 35000, 10000),
  ('00000000-0000-0000-0000-00000000cd05', '00000000-0000-0000-0000-000000000a01', 'rejected',
   '2027-09-10 15:00+00', '2027-09-10 16:00+00', tstzrange('2027-09-10 15:00+00', '2027-09-10 16:00+00'),
   '00000000-0000-0000-0000-000000000cc6', '00000000-0000-0000-0000-000000000cf4', 'zz-test cotizar',
   true, 35000, 10000),
  ('00000000-0000-0000-0000-00000000cd06', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '3 hours', now() - interval '2 hours',
   tstzrange(now() - interval '3 hours', now() - interval '2 hours'),
   '00000000-0000-0000-0000-000000000cc6', '00000000-0000-0000-0000-000000000cf4', 'zz-test cotizar',
   true, 35000, 10000);

SELECT is((SELECT within_window FROM public.scheduling_evaluate_cancellation('approved', now() + interval '48 hours', 10000)), true,
  'con justo la antelación de la ventana todavía no se pierde (el límite es inclusivo)');

SELECT is((SELECT within_window FROM public.scheduling_evaluate_cancellation('approved', now() + interval '48 hours' - interval '1 microsecond', 10000)), false,
  'con un microsegundo menos que la ventana ya se pierde');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit, window_hours
      FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd01')$$,
  $$VALUES (true, 0::bigint, 48)$$,
  'con mucha antelación, cancelar no pierde el anticipo');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd02')$$,
  $$VALUES (false, 10000::bigint)$$,
  'una aprobada fuera de la ventana avisa que pierde el anticipo congelado');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd03')$$,
  $$VALUES (false, 0::bigint)$$,
  'una pendiente fuera de la ventana no pierde nada');

SELECT is((SELECT technique_name FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd01')),
  'zz-test cotizar', 'devuelve el nombre de la técnica congelado en la cita');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd04')$$,
  'P0001', 'scheduling_appointment_not_cancellable', 'no cotiza la cita de otra clienta');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd05')$$,
  'P0001', 'scheduling_appointment_not_cancellable', 'no cotiza una cita rechazada');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd06')$$,
  'P0001', 'scheduling_appointment_not_cancellable', 'no cotiza una cita que ya pasó');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000ffff')$$,
  'P0001', 'scheduling_appointment_not_cancellable', 'una cita inexistente da el mismo error');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd02')$$,
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000cd02')$$,
  'lo que se muestra antes es exactamente lo que después se registra');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c05","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd01')$$,
  'P0001', 'scheduling_client_not_registered', 'una administradora sin perfil de clienta no la usa');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-00000000cd01')$$,
  '42501', NULL, 'un anónimo no la ejecuta');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.audit_events
            WHERE entity_id IN ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000cd03')
              OR (entity_id = '00000000-0000-0000-0000-00000000cd02'
                  AND action <> 'scheduling.appointment.cancelled')), 0::bigint,
  'cotizar no deja nada en la bitácora ni cambia citas');

SELECT * FROM finish();
ROLLBACK;
