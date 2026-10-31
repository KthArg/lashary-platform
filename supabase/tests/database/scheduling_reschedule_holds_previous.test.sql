-- US-AGE-10 · hallazgo A2: reagendar una cita aprobada guarda su horario anterior hasta que se decida.
-- Correr con: npx supabase test db
-- Lunes de prueba abiertos de 09:00 a 17:00: 2027-11-01, 2027-11-08, 2027-11-15 y 2027-11-22.
-- Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000002e1', 'hold-a@test.local'),
  ('00000000-0000-0000-0000-0000000002e2', 'hold-b@test.local');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000002e1',
   'Clienta A', 'hold-a@test.local', '+50688880081'),
  ('00000000-0000-0000-0000-0000000002c2', '00000000-0000-0000-0000-0000000002e2',
   'Clienta B', 'hold-b@test.local', '+50688880082');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;
UPDATE public.scheduling_reschedule_policy SET max_reschedules = 3;

-- 2a01: aprobada de A, el 1 de noviembre a las 09:00. 2a02: pendiente de B. 2a03: pendiente de A sin
-- nada aprobado. 2a04 y 2a05: de A, ya reagendadas, con el horario aprobado guardado cerca (dentro de
-- 10 h, fuera de la ventana) o lejos.
INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-000000002a01', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2027-11-01 09:00-06', '2027-11-01 10:00-06', tstzrange('2027-11-01 09:00-06', '2027-11-01 10:15-06'),
   '00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test guardar',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-000000002a02', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2027-11-01 13:00-06', '2027-11-01 14:00-06', tstzrange('2027-11-01 13:00-06', '2027-11-01 14:15-06'),
   '00000000-0000-0000-0000-0000000002c2', '00000000-0000-0000-0000-000000000ef4', 'zz-test guardar',
   true, 35000, 10000, 0),
  ('00000000-0000-0000-0000-000000002a03', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2027-11-01 15:00-06', '2027-11-01 16:00-06', tstzrange('2027-11-01 15:00-06', '2027-11-01 16:15-06'),
   '00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test guardar',
   true, 35000, 10000, 0);

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered,
   previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
VALUES
  ('00000000-0000-0000-0000-000000002a04', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2027-11-22 09:00-06', '2027-11-22 10:00-06', tstzrange('2027-11-22 09:00-06', '2027-11-22 10:15-06'),
   '00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test guardar',
   true, 35000, 10000, 10000,
   now() + interval '10 hours', now() + interval '11 hours',
   tstzrange(now() + interval '10 hours', now() + interval '11 hours 15 minutes'), 'approved'),
  ('00000000-0000-0000-0000-000000002a05', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2027-11-22 13:00-06', '2027-11-22 14:00-06', tstzrange('2027-11-22 13:00-06', '2027-11-22 14:15-06'),
   '00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test guardar',
   true, 35000, 10000, 10000,
   '2027-11-29 09:00-06', '2027-11-29 10:00-06', tstzrange('2027-11-29 09:00-06', '2027-11-29 10:15-06'),
   'approved');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002e1","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-000000002a01', '2027-11-08 09:00-06', 'approved')$$,
  'A reagenda su cita aprobada al 8 de noviembre');

RESET ROLE;

SELECT results_eq(
  $$SELECT status, starts_at, previous_status, previous_starts_at, previous_ends_at, previous_occupied_range
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000002a01'$$,
  $$VALUES ('pending_approval'::text, '2027-11-08 09:00-06'::timestamptz, 'approved'::text,
            '2027-11-01 09:00-06'::timestamptz, '2027-11-01 10:00-06'::timestamptz,
            tstzrange('2027-11-01 09:00-06', '2027-11-01 10:15-06'))$$,
  'la cita queda pendiente en el horario nuevo y guarda el aprobado completo, con su estado');

SELECT is(
  (SELECT payload ->> 'heldStartsAt' FROM public.audit_events
    WHERE action = 'scheduling.appointment.rescheduled' AND entity_id = '00000000-0000-0000-0000-000000002a01'),
  '2027-11-01T15:00:00+00:00', 'el evento trae el inicio guardado');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002e2","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-000000002a02', '2027-11-01 09:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_taken', 'B no puede tomar el espacio que A tiene guardado');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002e1","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-000000002a01', '2027-11-15 09:00-06', 'pending_approval')$$,
  'A reagenda otra vez mientras espera la decisión');

RESET ROLE;

SELECT results_eq(
  $$SELECT starts_at, previous_status, previous_starts_at, reschedule_count
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000002a01'$$,
  $$VALUES ('2027-11-15 09:00-06'::timestamptz, 'approved'::text, '2027-11-01 09:00-06'::timestamptz, 2)$$,
  'el segundo reagendado mueve el espacio nuevo; el guardado sigue siendo el último aprobado');

SELECT is(
  (SELECT count(*) FROM public.scheduling_appointments
    WHERE status IN ('pending_approval', 'approved', 'confirmed')
      AND blocked_ranges && tstzrange('2027-11-08 09:00-06', '2027-11-08 10:15-06')),
  0::bigint, 'el espacio intermedio queda libre');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002e2","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-000000002a02', '2027-11-08 09:00-06', 'pending_approval')$$,
  'B sí puede tomar el espacio intermedio que A soltó');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002e1","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-000000002a03', '2027-11-08 13:00-06', 'pending_approval')$$,
  'A reagenda una cita que estaba pendiente');

RESET ROLE;

SELECT is(
  (SELECT previous_status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000002a03'),
  NULL, 'una cita pendiente sin nada aprobado no guarda horario anterior');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002e1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-000000002a04', '2027-11-15 13:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_reschedule_outside_window',
  'con el horario aprobado guardado dentro de 10 h, la ventana se mide contra él: no se mueve');

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-000000002a05', '2027-11-15 15:00-06', 'pending_approval')$$,
  'con el horario guardado lejos, la cita se vuelve a mover');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
