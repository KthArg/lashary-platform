-- US-AGE-10 · el calendario de la clienta que reagenda ignora su propia cita, y solo la suya.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2027-09-06, abierto 09:00–17:00 (dos bloques que se tocan). Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000f02', 'ignore-a@test.local'),
  ('00000000-0000-0000-0000-000000000f03', 'ignore-b@test.local');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000000fc6', '00000000-0000-0000-0000-000000000f02',
   'Clienta A', 'ignore-a@test.local', '+50688880081'),
  ('00000000-0000-0000-0000-000000000fc7', '00000000-0000-0000-0000-000000000f03',
   'Clienta B', 'ignore-b@test.local', '+50688880082');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 1, 540, 720),
  ('00000000-0000-0000-0000-000000000a01', 1, 720, 1020);

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-00000000fa01', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2027-09-06 10:00-06', '2027-09-06 11:00-06', tstzrange('2027-09-06 10:00-06', '2027-09-06 11:15-06'),
   '00000000-0000-0000-0000-000000000fc6', '00000000-0000-0000-0000-000000000ff4', 'zz-test ignorar',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000fa02', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2027-09-06 14:00-06', '2027-09-06 15:00-06', tstzrange('2027-09-06 14:00-06', '2027-09-06 15:15-06'),
   '00000000-0000-0000-0000-000000000fc7', '00000000-0000-0000-0000-000000000ff4', 'zz-test ignorar',
   true, 35000, 10000, 10000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000f02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06')$$,
  $$VALUES ('2027-09-06 10:00-06'::timestamptz, '2027-09-06 11:30-06'::timestamptz),
           ('2027-09-06 14:00-06'::timestamptz, '2027-09-06 15:30-06'::timestamptz)$$,
  'sin la cita a ignorar responde como siempre: lo ocupado, redondeado a la grilla');

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06', '00000000-0000-0000-0000-00000000fa01')$$,
  $$VALUES ('2027-09-06 14:00-06'::timestamptz, '2027-09-06 15:30-06'::timestamptz)$$,
  'ignorando su propia cita, ese rango queda libre y el resto sigue ocupado');

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06', '00000000-0000-0000-0000-00000000fa02')$$,
  $$VALUES ('2027-09-06 10:00-06'::timestamptz, '2027-09-06 11:30-06'::timestamptz),
           ('2027-09-06 14:00-06'::timestamptz, '2027-09-06 15:30-06'::timestamptz)$$,
  'la cita de otra clienta no se ignora, y no se nota que se intentó');

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06', '00000000-0000-0000-0000-00000000fa99')$$,
  $$VALUES ('2027-09-06 10:00-06'::timestamptz, '2027-09-06 11:30-06'::timestamptz),
           ('2027-09-06 14:00-06'::timestamptz, '2027-09-06 15:30-06'::timestamptz)$$,
  'una cita que no existe no cambia nada');

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06', NULL)$$,
  $$VALUES ('2027-09-06 10:00-06'::timestamptz, '2027-09-06 11:30-06'::timestamptz),
           ('2027-09-06 14:00-06'::timestamptz, '2027-09-06 15:30-06'::timestamptz)$$,
  'el parámetro vacío equivale a no pasarlo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000f03","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06', '00000000-0000-0000-0000-00000000fa01')$$,
  $$VALUES ('2027-09-06 10:00-06'::timestamptz, '2027-09-06 11:30-06'::timestamptz),
           ('2027-09-06 14:00-06'::timestamptz, '2027-09-06 15:30-06'::timestamptz)$$,
  'quien pide ignorar una cita ajena (la de A) sigue viéndola ocupada');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000f02","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.scheduling_busy_ranges('00000000-0000-0000-0000-000000000a01', '2027-09-06')),
  2::bigint, 'la llamada de dos argumentos sigue funcionando');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_busy_ranges(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06', '00000000-0000-0000-0000-00000000fa01')$$,
  '42501', NULL, 'un anónimo no ejecuta la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
