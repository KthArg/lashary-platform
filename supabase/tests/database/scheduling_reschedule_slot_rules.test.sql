-- US-AGE-10 · reagendar: el espacio nuevo pasa lo mismo que una reserva, y el límite de pendientes, el tope y la bitácora.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2027-09-06 (abierto 09:00–12:00 y 12:00–17:00, dos bloques que se tocan),
-- 2027-09-13 (cerrado), 2027-09-20 (con un bloqueo de 10:00 a 11:00) y otros lunes abiertos.
-- Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(15);

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
  ('00000000-0000-0000-0000-00000000ea02', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2027-09-06 13:00-06', '2027-09-06 14:00-06', tstzrange('2027-09-06 13:00-06', '2027-09-06 14:15-06'),
   '00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ea08', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2027-10-18 09:00-06', '2027-10-18 10:00-06', tstzrange('2027-10-18 09:00-06', '2027-10-18 10:15-06'),
   '00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ea09', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2027-10-25 09:00-06', '2027-10-25 10:00-06', tstzrange('2027-10-25 09:00-06', '2027-10-25 10:15-06'),
   '00000000-0000-0000-0000-000000000ec6', '00000000-0000-0000-0000-000000000ef4', 'zz-test reagendar',
   true, 35000, 10000, 10000, NULL, NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000e02","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2027-09-13 09:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_not_offered', 'no se mueve a un día cerrado');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2020-01-06 09:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_not_offered', 'no se mueve al pasado');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2027-09-27 09:15-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_not_offered', 'no se mueve a una hora fuera de la grilla');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2027-09-27 16:30-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_not_offered', 'no se mueve a un espacio que termina después del cierre');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2027-09-26 09:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_not_offered', 'no se mueve a un día sin horario');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', '2027-09-06 13:00-06', 'pending_approval')$$,
  'P0001', 'scheduling_slot_not_offered', 'mover una cita a la misma hora no es reagendar');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea02', NULL, 'pending_approval')$$,
  'P0001', 'scheduling_slot_not_offered', 'sin hora nueva no se mueve');

SELECT results_eq(
  $$SELECT starts_at, reschedule_count
      FROM public.scheduling_reschedule_appointment(
        '00000000-0000-0000-0000-00000000ea02', '2027-09-06 13:30-06', 'pending_approval')$$,
  $$VALUES ('2027-09-06 13:30-06'::timestamptz, 1)$$,
  'el espacio nuevo puede cruzarse con el viejo de la misma cita: no choca consigo misma');

RESET ROLE;
UPDATE public.scheduling_booking_limits SET max_pending_per_client = 1;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000e02","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea08', '2027-11-08 09:00-06', 'approved')$$,
  'P0001', 'scheduling_too_many_pending', 'una cita aprobada que vuelve a pendiente cuenta contra el límite de pendientes');

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea09', '2027-11-01 09:00-06', 'pending_approval')$$,
  'una cita que ya era pendiente no cuenta dos veces');

RESET ROLE;
UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;
UPDATE public.scheduling_reschedule_policy SET max_reschedules = 0;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000e02","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea08', '2027-11-08 09:00-06', 'approved')$$,
  'P0001', 'scheduling_reschedule_limit_reached', 'con el tope en 0 reagendar está desactivado');

RESET ROLE;
UPDATE public.scheduling_reschedule_policy SET max_reschedules = 1;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000e04","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea08', '2027-11-08 09:00-06', 'approved')$$,
  'P0001', 'scheduling_client_not_registered', 'una usuaria sin perfil de clienta no reagenda');

RESET ROLE;

CREATE FUNCTION pg_temp.fail_reschedule_audit() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'bitacora caida'; END; $$;

CREATE TRIGGER fail_reschedule_audit BEFORE INSERT ON public.audit_events
  FOR EACH ROW WHEN (NEW.action = 'scheduling.appointment.rescheduled')
  EXECUTE FUNCTION pg_temp.fail_reschedule_audit();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000e02","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea08', '2027-11-08 09:00-06', 'approved')$$,
  'P0001', 'bitacora caida', 'si la bitácora falla, el reagendado falla');

RESET ROLE;

SELECT results_eq(
  $$SELECT starts_at, status, reschedule_count FROM public.scheduling_appointments
     WHERE id = '00000000-0000-0000-0000-00000000ea08'$$,
  $$VALUES ('2027-10-18 09:00-06'::timestamptz, 'approved'::text, 0)$$,
  'y la cita queda donde estaba: ni se movió ni subió el contador');

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000ea08', '2027-11-08 09:00-06', 'approved')$$,
  '42501', NULL, 'un anónimo no ejecuta la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
