-- US-AGE-10 · hallazgo A2: cerrar un día y quitar un bloque semanal respetan el horario que guarda un
-- reagendado, y los conteos del panel lo cuentan.
-- Correr con: npx supabase test db
-- Horario guardado: martes 2027-12-07 a las 10:00. Horario nuevo: jueves 2027-12-16 a las 10:00.
-- Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000006e1', 'held-reduce-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000006e1';

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (id, resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-0000000006b2', '00000000-0000-0000-0000-000000000a01', 2, 540, 1020),
  ('00000000-0000-0000-0000-0000000006b4', '00000000-0000-0000-0000-000000000a01', 4, 540, 1020),
  ('00000000-0000-0000-0000-0000000006b5', '00000000-0000-0000-0000-000000000a01', 5, 540, 1020);

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range,
   previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
VALUES ('00000000-0000-0000-0000-000000006a01', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
        '2027-12-16 10:00-06', '2027-12-16 11:00-06', tstzrange('2027-12-16 10:00-06', '2027-12-16 11:15-06'),
        '2027-12-07 10:00-06', '2027-12-07 11:00-06', tstzrange('2027-12-07 10:00-06', '2027-12-07 11:15-06'),
        'approved');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006e1","role":"authenticated"}', true);

SELECT is(
  public.scheduling_count_appointments_in_range(
    '00000000-0000-0000-0000-000000000a01', '2027-12-07 00:00-06', '2027-12-08 00:00-06'),
  1, 'conteo por rango: el día del horario guardado tiene una cita');

SELECT is(
  public.scheduling_count_appointments_in_range(
    '00000000-0000-0000-0000-000000000a01', '2027-12-01 00:00-06', '2027-12-31 00:00-06'),
  1, 'conteo por rango: la cita cuenta una vez aunque sus dos espacios caigan dentro');

SELECT is(
  public.scheduling_count_appointments_affected_by_weekly_block('00000000-0000-0000-0000-0000000006b2'),
  1, 'conteo semanal: quitar el martes afecta la cita por su horario guardado');

SELECT is(
  public.scheduling_count_appointments_affected_by_weekly_block('00000000-0000-0000-0000-0000000006b4'),
  1, 'conteo semanal: quitar el jueves la afecta por su horario nuevo');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-12-07', 'non_working')$$,
  '23514', 'scheduling_closed_dates_active_appointment',
  'cerrar el día del horario guardado se rechaza');

SELECT throws_ok(
  $$DELETE FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-0000-0000-0000000006b2'$$,
  '23514', 'scheduling_weekly_availability_active_appointments',
  'quitar el bloque semanal del horario guardado se rechaza');

SELECT lives_ok(
  $$DELETE FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-0000-0000-0000000006b5'$$,
  'quitar un bloque sin ninguno de los dos espacios sí se puede');

RESET ROLE;

UPDATE public.scheduling_appointments SET status = 'cancelled'
 WHERE id = '00000000-0000-0000-0000-000000006a01';

SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-12-07', 'non_working')$$,
  'con la cita cancelada, el día se puede cerrar');

SELECT * FROM finish();
ROLLBACK;
