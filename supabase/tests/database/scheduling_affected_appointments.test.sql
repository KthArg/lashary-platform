-- US-AGE-05 · scheduling — cuántas citas afecta reducir la disponibilidad (criterio 9).
-- Correr con: npx supabase test db
-- Lunes de prueba 2027-09-06, 2027-09-13 y 2027-09-20; martes 2027-09-07 y 2027-09-14. UTC-6.

BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005f1', 'affected-admin@test.local'),
  ('00000000-0000-0000-0000-0000000005f2', 'affected-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000005f3', 'affected-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005f1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000005cc', '00000000-0000-0000-0000-0000000005f2',
   'Clienta A', 'affected-clienta-a@test.local', '+50688880012'),
  ('00000000-0000-0000-0000-0000000005cd', '00000000-0000-0000-0000-0000000005f3',
   'Clienta B', 'affected-clienta-b@test.local', '+50688880013');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
INSERT INTO public.scheduling_weekly_availability (id, resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000a01', 1, 540, 720),
  ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-000000000a01', 1, 720, 1020),
  ('00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-000000000a01', 2, 540, 720),
  ('00000000-0000-0000-0000-00000000b004', '00000000-0000-0000-0000-000000000a01', 1, 1020, 1080);

INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2027-09-06 10:00-06', '2027-09-06 11:00-06',
   tstzrange('2027-09-06 10:00-06', '2027-09-06 11:15-06'), 'pending_approval',
   '00000000-0000-0000-0000-0000000005cc', '00000000-0000-0000-0000-000000000e11', 'Dentro del primer bloque', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-09-06 11:30-06', '2027-09-06 12:30-06',
   tstzrange('2027-09-06 11:30-06', '2027-09-06 12:45-06'), 'approved',
   '00000000-0000-0000-0000-0000000005cc', '00000000-0000-0000-0000-000000000e11', 'Cruza los dos bloques', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-09-13 15:00-06', '2027-09-13 16:00-06',
   tstzrange('2027-09-13 15:00-06', '2027-09-13 16:15-06'), 'confirmed',
   '00000000-0000-0000-0000-0000000005cc', '00000000-0000-0000-0000-000000000e11', 'Dentro del segundo bloque', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-09-07 10:00-06', '2027-09-07 11:00-06',
   tstzrange('2027-09-07 10:00-06', '2027-09-07 11:15-06'), 'cancelled',
   '00000000-0000-0000-0000-0000000005cc', '00000000-0000-0000-0000-000000000e11', 'Cancelada', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-09-14 10:00-06', '2027-09-14 11:00-06',
   tstzrange('2027-09-14 10:00-06', '2027-09-14 11:15-06'), 'pending_approval',
   '00000000-0000-0000-0000-0000000005cc', '00000000-0000-0000-0000-000000000e11', 'Martes pendiente', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-09-20 10:00-06', '2027-09-20 11:00-06',
   tstzrange('2027-09-20 10:00-06', '2027-09-20 11:15-06'), 'rejected',
   '00000000-0000-0000-0000-0000000005cc', '00000000-0000-0000-0000-000000000e11', 'Rechazada', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2020-01-06 10:00-06', '2020-01-06 11:00-06',
   tstzrange('2020-01-06 10:00-06', '2020-01-06 11:15-06'), 'pending_approval',
   '00000000-0000-0000-0000-0000000005cc', '00000000-0000-0000-0000-000000000e11', 'Ya pasó', true, 1000, 0);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005f1","role":"authenticated"}', true);

SELECT is(public.scheduling_count_appointments_affected_by_weekly_block('00000000-0000-0000-0000-00000000b001'), 2,
  'quitar el primer bloque del lunes afecta la cita de dentro y la que cruzaba los dos bloques');

SELECT is(public.scheduling_count_appointments_affected_by_weekly_block('00000000-0000-0000-0000-00000000b002'), 2,
  'quitar el segundo bloque afecta la que cruzaba y la de la tarde');

SELECT is(public.scheduling_count_appointments_affected_by_weekly_block('00000000-0000-0000-0000-00000000b003'), 1,
  'una cancelada no cuenta: del martes solo la pendiente');

SELECT is(public.scheduling_count_appointments_affected_by_weekly_block('00000000-0000-0000-0000-00000000b004'), 0,
  'un bloque sin ninguna cita no afecta nada');

SELECT is(public.scheduling_count_appointments_affected_by_weekly_block('00000000-0000-0000-0000-00000000ffff'), 0,
  'un bloque que no existe no afecta nada');

SELECT is(
  public.scheduling_count_appointments_in_range('00000000-0000-0000-0000-000000000a01',
    '2027-09-06 00:00-06', '2027-09-07 00:00-06'), 2,
  'cerrar un día afecta las citas vigentes de ese día');

SELECT is(
  public.scheduling_count_appointments_in_range('00000000-0000-0000-0000-000000000a01',
    '2027-09-06 11:10-06', '2027-09-06 11:20-06'), 1,
  'un bloqueo que toca solo la limpieza de una cita la afecta');

SELECT is(
  public.scheduling_count_appointments_in_range('00000000-0000-0000-0000-000000000a01',
    '2027-09-06 11:15-06', '2027-09-06 11:30-06'), 0,
  'un bloqueo justo entre dos citas, sin tocarlas, no afecta nada');

SELECT is(
  public.scheduling_count_appointments_in_range('00000000-0000-0000-0000-000000000a01',
    '2027-09-20 00:00-06', '2027-09-21 00:00-06'), 0,
  'una cita rechazada no cuenta');

SELECT is(
  public.scheduling_count_appointments_in_range('00000000-0000-0000-0000-000000000a01',
    '2020-01-06 00:00-06', '2020-01-07 00:00-06'), 0,
  'una cita que ya pasó no cuenta');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005f3","role":"authenticated"}', true);

SELECT is(
  public.scheduling_count_appointments_in_range('00000000-0000-0000-0000-000000000a01',
    '2027-09-06 00:00-06', '2027-09-07 00:00-06'), 0,
  'una clienta no cuenta las citas de otra: la RLS se las oculta');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_count_appointments_in_range('00000000-0000-0000-0000-000000000a01',
      '2027-09-06 00:00-06', '2027-09-07 00:00-06')$$,
  '42501', NULL, 'anónimo: no ejecuta el conteo por rango');

SELECT throws_ok(
  $$SELECT public.scheduling_count_appointments_affected_by_weekly_block('00000000-0000-0000-0000-00000000b001')$$,
  '42501', NULL, 'anónimo: no ejecuta el conteo por bloque semanal');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments WHERE status IN ('pending_approval', 'approved', 'confirmed')),
  5, 'contar no borra ni cambia ninguna cita');

SELECT * FROM finish();
ROLLBACK;
