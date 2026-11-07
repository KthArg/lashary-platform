-- US-NOT-02 · ítem 13: la clienta recibe aviso cuando su reagendado se rechaza o vence.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2047-10-07 y 2047-10-14, abiertos de 09:00 a 17:00. Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000006b1', 'aviso-resultado-admin@test.local'),
  ('00000000-0000-0000-0000-0000000006b2', 'aviso-resultado-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000006b1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000006c2', '00000000-0000-0000-0000-0000000006b2',
        'Clienta', 'aviso-resultado-clienta@test.local', '+50688880094');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);
UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, decided_by, decided_at)
VALUES
  ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-10-07 09:00-06', '2047-10-07 10:00-06', tstzrange('2047-10-07 09:00-06', '2047-10-07 10:15-06'),
   '00000000-0000-0000-0000-0000000006c2', '00000000-0000-0000-0000-0000000006f4', 'zz-test resultado',
   true, 35000, 10000, 10000, '00000000-0000-0000-0000-0000000006b1', now());

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, package_id, package_name,
   service_price, deposit_required, deposit_registered, reschedule_count,
   previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
VALUES
  ('00000000-0000-0000-0000-00000000ab02', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2041-09-01 10:00+00', '2041-09-01 11:00+00', tstzrange('2041-09-01 10:00+00', '2041-09-01 11:15+00'),
   '00000000-0000-0000-0000-0000000006c2', '00000000-0000-0000-0000-0000000006f9', 'zz-test paquete resultado',
   45000, 12000, 12000, 1,
   date_trunc('minute', now()) + interval '20 hours', date_trunc('minute', now()) + interval '21 hours',
   tstzrange(date_trunc('minute', now()) + interval '20 hours', date_trunc('minute', now()) + interval '21 hours 15 minutes'),
   'approved');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006b2","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ab01', '2047-10-14 09:00-06', 'approved')$$,
  'la clienta pide cambiar su cita');

SELECT is((SELECT count(*)::int FROM public.notifications_client_notices), 0,
  'pedir el cambio no le deja ningún aviso a la clienta');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006b1","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT * FROM public.scheduling_decide_appointment(
      '00000000-0000-0000-0000-00000000ab01', 'rejected', 'ese día no hay espacio', '2047-10-14 09:00-06')$$,
  'la administradora rechaza el cambio');
SELECT is(public.scheduling_expire_undecided_reschedules(), 1,
  'el ciclo vence el reagendado que nadie decidió a tiempo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006b2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT kind, service_name, requested_starts_at, kept_starts_at, status
      FROM public.notifications_client_notices WHERE appointment_id = '00000000-0000-0000-0000-00000000ab01'$$,
  $$VALUES ('reschedule_rejected'::text, 'zz-test resultado'::text,
            '2047-10-14 09:00-06'::timestamptz, '2047-10-07 09:00-06'::timestamptz, 'pending'::text)$$,
  'rechazado: la clienta ve su aviso con el horario que pidió y el que conserva, pendiente de enviar');

SELECT results_eq(
  $$SELECT kind, service_name, requested_starts_at, kept_starts_at
      FROM public.notifications_client_notices WHERE appointment_id = '00000000-0000-0000-0000-00000000ab02'$$,
  $$VALUES ('reschedule_expired'::text, 'zz-test paquete resultado'::text,
            '2041-09-01 10:00+00'::timestamptz, date_trunc('minute', now()) + interval '20 hours')$$,
  'vencido: el aviso nombra el paquete y el horario que conserva');

RESET ROLE;

ALTER TABLE public.notifications_client_notices ADD CONSTRAINT zz_test_rejects_every_notice CHECK (false) NOT VALID;
INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, reschedule_count,
   previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
VALUES
  ('00000000-0000-0000-0000-00000000ab03', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2041-09-08 10:00+00', '2041-09-08 11:00+00', tstzrange('2041-09-08 10:00+00', '2041-09-08 11:15+00'),
   '00000000-0000-0000-0000-0000000006c2', '00000000-0000-0000-0000-0000000006f4', 'zz-test resultado',
   true, 35000, 10000, 10000, 1,
   date_trunc('minute', now()) + interval '23 hours', date_trunc('minute', now()) + interval '24 hours',
   tstzrange(date_trunc('minute', now()) + interval '23 hours', date_trunc('minute', now()) + interval '24 hours 15 minutes'),
   'approved');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006b1","role":"authenticated"}', true);
SELECT is(public.scheduling_expire_undecided_reschedules(), 1,
  'si el aviso no se puede guardar, el reagendado igual vence');
RESET ROLE;
SELECT is((SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000ab03'),
  'approved', 'la cita volvió a su horario aprobado, aunque sin aviso');
SELECT is((SELECT count(*)::int FROM public.notifications_client_notices
            WHERE appointment_id = '00000000-0000-0000-0000-00000000ab03'), 0,
  'y no quedó un aviso a medias');

SELECT * FROM finish();
ROLLBACK;
