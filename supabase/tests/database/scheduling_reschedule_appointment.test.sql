-- US-AGE-10 · la clienta reagenda una cita suya; la base valida la ventana, el tope y el espacio nuevo.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2027-09-06 (abierto 09:00–12:00 y 12:00–17:00, dos bloques que se tocan),
-- 2027-09-13 (cerrado), 2027-09-20 (con un bloqueo de 10:00 a 11:00) y otros lunes abiertos.
-- Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000e02', 'resched-a@test.local'),
  ('00000000-0000-0000-0000-000000000e03', 'resched-b@test.local'),
  ('00000000-0000-0000-0000-000000000e04', 'resched-sin-perfil@test.local'),
  ('00000000-0000-0000-0000-000000000e05', 'resched-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000e05';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000e02',
   'Clienta A', 'resched-a@test.local', '+50688880071'),
  ('00000000-0000-0000-0000-000000000ec7', '00000000-0000-0000-0000-000000000e03',
   'Clienta B', 'resched-b@test.local', '+50688880072');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 1, 540, 720),
  ('00000000-0000-0000-0000-000000000a01', 1, 720, 1020);

INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
VALUES ('00000000-0000-0000-0000-000000000a01', '2027-09-13', 'non_working');

INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
VALUES ('00000000-0000-0000-0000-000000000a01', '2027-09-20 10:00-06', '2027-09-20 11:00-06');

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, decided_by, decided_at)
VALUES
  ('00000000-0000-0000-0000-00000000ea01', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2027-09-06 09:00-06', '2027-09-06 10:00-06', tstzrange('2027-09-06 09:00-06', '2027-09-06 10:15-06'),
   '00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, '00000000-0000-0000-0000-000000000e05', now()),
  ('00000000-0000-0000-0000-00000000ea02', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2027-09-06 13:00-06', '2027-09-06 14:00-06', tstzrange('2027-09-06 13:00-06', '2027-09-06 14:15-06'),
   '00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ea03', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '10 hours', now() + interval '11 hours',
   tstzrange(now() + interval '10 hours', now() + interval '11 hours 15 minutes'),
   '00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ea04', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() + interval '12 hours', now() + interval '13 hours',
   tstzrange(now() + interval '12 hours', now() + interval '13 hours 15 minutes'),
   '00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ea05', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2027-09-06 11:00-06', '2027-09-06 12:00-06', tstzrange('2027-09-06 11:00-06', '2027-09-06 12:15-06'),
   '00000000-0000-0000-0000-000000000ec7', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ea07', '00000000-0000-0000-0000-000000000a01', 'cancelled',
   '2027-10-11 09:00-06', '2027-10-11 10:00-06', tstzrange('2027-10-11 09:00-06', '2027-10-11 10:15-06'),
   '00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, NULL, NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000e02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT starts_at, status, reschedule_count
      FROM public.scheduling_reschedule_appointment(
        '00000000-0000-0000-0000-00000000ea01', '2027-09-27 09:00-06', 'approved')$$,
  $$VALUES ('2027-09-27 09:00-06'::timestamptz, 'pending_approval'::text, 1)$$,
  'una cita aprobada se mueve, vuelve a pendiente y cuenta un reagendado');

RESET ROLE;

SELECT results_eq(
  $$SELECT service_price, deposit_required, deposit_registered, technique_name,
           decided_by IS NULL AND decided_at IS NULL,
           ends_at - starts_at, upper(occupied_range) - ends_at
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000ea01'$$,
  $$VALUES (35000::bigint, 10000::bigint, 10000::bigint, 'zz-test reagendar'::text,
            true, interval '1 hour', interval '15 minutes')$$,
  'el precio, el anticipo y la duración quedan; nadie figura como quien decidió');

SELECT is((SELECT count(*) FROM public.scheduling_appointments
            WHERE status IN ('pending_approval', 'approved', 'confirmed')
              AND occupied_range && tstzrange('2027-09-06 09:00-06', '2027-09-06 10:15-06')), 0::bigint,
  'el espacio viejo quedó libre');

SELECT results_eq(
  $$SELECT payload FROM public.audit_events WHERE action = 'scheduling.appointment.rescheduled'$$,
  $$VALUES ('{"newEndsAt": "2027-09-27T16:00:00+00:00", "newStartsAt": "2027-09-27T15:00:00+00:00",
             "previousEndsAt": "2027-09-06T16:00:00+00:00", "previousStatus": "approved",
             "previousStartsAt": "2027-09-06T15:00:00+00:00", "techniqueName": "zz-test reagendar",
             "rescheduleCount": 1, "maxReschedules": 1, "depositRegistered": 10000}'::jsonb)$$,
  'el evento trae el horario anterior y el nuevo, en la misma transacción');

SELECT is((SELECT actor_id FROM public.audit_events WHERE action = 'scheduling.appointment.rescheduled'),
  '00000000-0000-0000-0000-000000000e02'::uuid, 'la actora del evento es la clienta de la sesión');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000e02","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea01', '2027-10-04 09:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_reschedule_limit_reached', 'no se pasa del tope de reagendados por cita');

SELECT results_eq(
  $$SELECT status, reschedule_count
      FROM public.scheduling_reschedule_appointment(
        '00000000-0000-0000-0000-00000000ea04', '2027-09-27 11:00-06', 'pending_approval')$$,
  $$VALUES ('pending_approval'::text, 1)$$,
  'una cita pendiente se mueve aunque falten pocas horas: sin ventana');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea03', '2027-10-04 09:00-06', 'approved')$$,
  'P0001', 'scheduling_reschedule_outside_window', 'una cita aprobada fuera de la ventana no se mueve');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2027-10-04 09:00-06', 'approved')$$,
  'P0001', 'scheduling_reschedule_state_changed', 'si la cita ya no está como la vio la clienta, no se mueve');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea07', '2027-10-04 09:00-06', 'cancelled')$$,
  'P0001', 'scheduling_appointment_not_reschedulable', 'una cita cancelada no se mueve');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea05', '2027-10-04 09:00-06', 'approved')$$,
  'P0001', 'scheduling_appointment_not_reschedulable', 'la cita de otra clienta no se mueve');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2027-09-06 11:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_taken', 'no se mueve a un espacio con la cita de otra clienta');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2027-09-20 10:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_taken', 'no se mueve a un espacio con un bloqueo manual');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
