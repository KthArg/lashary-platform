-- US-NOT-08 · aprobar una cita pide la confirmación; dejar de estar aprobada retira lo que no salió.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000082b02', 'aviso-confirmar@test.local'),
  ('00000000-0000-0000-0000-000000082b05', 'aviso-confirmar-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000082b05';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-000000082bc6', '00000000-0000-0000-0000-000000082b02',
        'Clienta', 'aviso-confirmar@test.local', '+50688880821');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
SELECT seeds.id::uuid, '00000000-0000-0000-0000-000000000a01', 'pending_approval',
       now() + (seeds.hours || ' hours')::interval, now() + ((seeds.hours + 1) || ' hours')::interval,
       tstzrange(now() + (seeds.hours || ' hours')::interval, now() + ((seeds.hours + 1) || ' hours')::interval),
       seeds.client_id::uuid, '00000000-0000-0000-0000-000000000bf4', 'zz-test confirmar',
       true, 35000, 10000, 8000
  FROM (VALUES
    ('00000000-0000-0000-0000-00000008ea01', 2000, '00000000-0000-0000-0000-000000082bc6'),
    ('00000000-0000-0000-0000-00000008ea02', 2010, '00000000-0000-0000-0000-000000082bc6')
  ) AS seeds(id, hours, client_id);

INSERT INTO public.scheduling_appointments (id, resource_id, status, starts_at, ends_at, occupied_range)
VALUES
  ('00000000-0000-0000-0000-00000008ea03', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() + interval '2020 hours', now() + interval '2021 hours',
   tstzrange(now() + interval '2020 hours', now() + interval '2021 hours'));

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, package_id, package_name,
   service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-00000008ea04', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() + interval '2030 hours', now() + interval '2031 hours',
   tstzrange(now() + interval '2030 hours', now() + interval '2031 hours'),
   '00000000-0000-0000-0000-000000082bc6', '00000000-0000-0000-0000-00000000bb01', 'zz-test paquete',
   45000, 12000, 12000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000082b05","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_decide_appointment(
      '00000000-0000-0000-0000-00000008ea01', 'approved', NULL,
      (SELECT starts_at FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000008ea01'))$$,
  'la administradora aprueba la cita');
RESET ROLE;

SELECT results_eq(
  $$SELECT client_id, service_name, status FROM public.notifications_confirmation_requests
     WHERE appointment_id = '00000000-0000-0000-0000-00000008ea01'$$,
  $$VALUES ('00000000-0000-0000-0000-000000082bc6'::uuid, 'zz-test confirmar', 'pending')$$,
  'aprobar deja la solicitud de confirmación (criterio 1)');

SELECT is_empty(
  $$SELECT id FROM public.notifications_confirmation_requests
     WHERE appointment_id = '00000000-0000-0000-0000-00000008ea02'$$,
  'una cita pendiente todavía no pide confirmación');

UPDATE public.scheduling_appointments SET status = 'approved'
 WHERE id = '00000000-0000-0000-0000-00000008ea04';

SELECT is(
  (SELECT service_name FROM public.notifications_confirmation_requests
    WHERE appointment_id = '00000000-0000-0000-0000-00000008ea04'),
  'zz-test paquete', 'una cita de paquete se nombra por el paquete');

UPDATE public.scheduling_appointments SET status = 'approved'
 WHERE id = '00000000-0000-0000-0000-00000008ea03';

SELECT is_empty(
  $$SELECT id FROM public.notifications_confirmation_requests
     WHERE appointment_id = '00000000-0000-0000-0000-00000008ea03'$$,
  'una cita sin clienta no pide confirmación');

UPDATE public.scheduling_appointments SET status = 'cancelled'
 WHERE id = '00000000-0000-0000-0000-00000008ea01';

SELECT is(
  (SELECT status FROM public.notifications_confirmation_requests
    WHERE appointment_id = '00000000-0000-0000-0000-00000008ea01'),
  'cancelled', 'cancelar la cita retira lo que no salió');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000082b02","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ea04')$$,
  'la clienta confirma antes de que salga el mensaje');
RESET ROLE;

SELECT is(
  (SELECT status FROM public.notifications_confirmation_requests
    WHERE appointment_id = '00000000-0000-0000-0000-00000008ea04'),
  'cancelled', 'una cita ya confirmada no recibe el mensaje');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered,
   previous_status, previous_starts_at, previous_ends_at, previous_occupied_range)
VALUES
  ('00000000-0000-0000-0000-00000008ea05', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() + interval '2050 hours', now() + interval '2051 hours',
   tstzrange(now() + interval '2050 hours', now() + interval '2051 hours'),
   '00000000-0000-0000-0000-000000082bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test confirmar',
   true, 35000, 10000, 8000,
   'approved', now() + interval '2040 hours', now() + interval '2041 hours',
   tstzrange(now() + interval '2040 hours', now() + interval '2041 hours'));

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000082b05","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT * FROM public.scheduling_decide_appointment('00000000-0000-0000-0000-00000008ea05', 'rejected', 'zz-test')$$,
  'la administradora rechaza el reagendado');
RESET ROLE;

SELECT is(
  (SELECT r.starts_at = a.starts_at AND r.status = 'pending'
     FROM public.notifications_confirmation_requests r
     JOIN public.scheduling_appointments a ON a.id = r.appointment_id
    WHERE r.appointment_id = '00000000-0000-0000-0000-00000008ea05'),
  true, 'un reagendado rechazado vuelve a aprobada y pide confirmación con el horario devuelto');

UPDATE public.notifications_confirmation_requests SET status = 'sent'
 WHERE appointment_id = '00000000-0000-0000-0000-00000008ea05';
UPDATE public.scheduling_appointments
   SET status = 'pending_approval',
       starts_at = now() + interval '2060 hours',
       ends_at = now() + interval '2061 hours',
       occupied_range = tstzrange(now() + interval '2060 hours', now() + interval '2061 hours')
 WHERE id = '00000000-0000-0000-0000-00000008ea05';
UPDATE public.scheduling_appointments SET status = 'approved'
 WHERE id = '00000000-0000-0000-0000-00000008ea05';

SELECT results_eq(
  $$SELECT status FROM public.notifications_confirmation_requests
     WHERE appointment_id = '00000000-0000-0000-0000-00000008ea05' ORDER BY starts_at$$,
  $$VALUES ('sent'), ('pending')$$,
  'un reagendado aprobado vuelve a pedir confirmación para el horario nuevo');

ALTER FUNCTION public.notifications_cancel_confirmation_request(uuid) RENAME TO notifications_cancel_renamed;
UPDATE public.scheduling_appointments SET status = 'pending_approval'
 WHERE id = '00000000-0000-0000-0000-00000008ea02';
UPDATE public.scheduling_appointments SET status = 'approved'
 WHERE id = '00000000-0000-0000-0000-00000008ea02';
SELECT lives_ok(
  $$UPDATE public.scheduling_appointments SET status = 'cancelled'
     WHERE id = '00000000-0000-0000-0000-00000008ea02'$$,
  'si notifications falla, la cita conserva su cambio de estado');
ALTER FUNCTION public.notifications_cancel_renamed(uuid) RENAME TO notifications_cancel_confirmation_request;

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE action = 'scheduling.confirmation_request.failed'
      AND entity_id = '00000000-0000-0000-0000-00000008ea02'),
  1,
  'el fallo de notifications deja rastro en la bitácora');

SELECT * FROM finish();
ROLLBACK;
