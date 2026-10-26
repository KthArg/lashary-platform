-- US-AGE-10 · aprobar solo si el horario es el que la administradora vio.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'decide-seen-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'decide-seen-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f1';

INSERT INTO public.scheduling_appointments (id, resource_id, starts_at, ends_at, occupied_range)
VALUES
  ('00000000-0000-0000-0000-00000000f901', '00000000-0000-0000-0000-000000000a01',
   '2027-10-01 10:00+00', '2027-10-01 11:00+00', tstzrange('2027-10-01 10:00+00', '2027-10-01 11:15+00', '[)')),
  ('00000000-0000-0000-0000-00000000f902', '00000000-0000-0000-0000-000000000a01',
   '2027-10-02 10:00+00', '2027-10-02 11:00+00', tstzrange('2027-10-02 10:00+00', '2027-10-02 11:15+00', '[)')),
  ('00000000-0000-0000-0000-00000000f903', '00000000-0000-0000-0000-000000000a01',
   '2027-10-03 10:00+00', '2027-10-03 11:00+00', tstzrange('2027-10-03 10:00+00', '2027-10-03 11:15+00', '[)')),
  ('00000000-0000-0000-0000-00000000f904', '00000000-0000-0000-0000-000000000a01',
   '2027-10-04 10:00+00', '2027-10-04 11:00+00', tstzrange('2027-10-04 10:00+00', '2027-10-04 11:15+00', '[)'));

CREATE TEMP TABLE schedule_changed_detail (detail text);
GRANT ALL ON schedule_changed_detail TO PUBLIC;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

SELECT is(
  (SELECT status FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000f901', 'approved', NULL, '2027-10-01 10:00+00')),
  'approved', 'aprobar con el horario que vio la administradora aprueba la cita');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_decide_appointment(
      '00000000-0000-0000-0000-00000000f902', 'approved', NULL, '2027-10-02 09:00+00')$$,
  'P0001', 'scheduling_appointment_schedule_changed',
  'aprobar con un horario distinto del vigente falla');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_decide_appointment('00000000-0000-0000-0000-00000000f902', 'approved')$$,
  'P0001', 'scheduling_appointment_schedule_changed',
  'aprobar sin decir qué horario se vio también falla');

DO $$
DECLARE
  v_detail text;
BEGIN
  PERFORM * FROM public.scheduling_decide_appointment(
    '00000000-0000-0000-0000-00000000f902', 'approved', NULL, '2027-10-02 09:00+00');
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
  INSERT INTO schedule_changed_detail VALUES (v_detail);
END
$$;

SELECT is(
  (SELECT detail FROM schedule_changed_detail),
  floor(extract(epoch FROM '2027-10-02 10:00+00'::timestamptz) * 1000)::bigint::text
    || '|' || floor(extract(epoch FROM '2027-10-02 11:00+00'::timestamptz) * 1000)::bigint::text,
  'el error trae el inicio y el fin vigentes en milisegundos para mostrarlos');

SELECT is(
  (SELECT status || ':' || coalesce(decided_by::text, 'nadie') FROM public.scheduling_appointments
    WHERE id = '00000000-0000-0000-0000-00000000f902'),
  'pending_approval:nadie', 'tras el fallo la cita sigue pendiente y sin decisión');

SELECT is(
  (SELECT status FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000f902', 'rejected', 'horario no disponible')),
  'rejected', 'rechazar no exige haber visto el horario');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000f901', 'approved', NULL, '2020-01-01 00:00+00')),
  0, 'una cita que ya no está pendiente no devuelve fila, aunque el horario no coincida');

RESET ROLE;
UPDATE public.scheduling_appointments
   SET starts_at = '2027-10-03 12:00+00', ends_at = '2027-10-03 13:00+00',
       occupied_range = tstzrange('2027-10-03 12:00+00', '2027-10-03 13:15+00', '[)')
 WHERE id = '00000000-0000-0000-0000-00000000f903';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_decide_appointment(
      '00000000-0000-0000-0000-00000000f903', 'approved', NULL, '2027-10-03 10:00+00')$$,
  'P0001', 'scheduling_appointment_schedule_changed',
  'si la clienta movió la cita, aprobar el horario viejo falla');

SELECT is(
  (SELECT status FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000f903', 'approved', NULL, '2027-10-03 12:00+00')),
  'approved', 'con el horario nuevo a la vista, se aprueba');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000f904', 'approved', NULL, '2027-10-04 10:00+00')),
  0, 'una clienta no decide ninguna cita');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_decide_appointment(
      '00000000-0000-0000-0000-00000000f904', 'approved', NULL, '2027-10-04 10:00+00')$$,
  '42501', NULL, 'un anónimo no ejecuta la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
