-- US-AGE-05 · scheduling — el historial de la clienta decide si es primera vez o re-aplicación.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005b2', 'history-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000005b3', 'history-clienta-b@test.local'),
  ('00000000-0000-0000-0000-0000000005b4', 'history-sin-perfil@test.local'),
  ('00000000-0000-0000-0000-0000000005b5', 'history-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005b5';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000005ca', '00000000-0000-0000-0000-0000000005b2',
   'Clienta A', 'history-clienta-a@test.local', '+50688880010'),
  ('00000000-0000-0000-0000-0000000005cb', '00000000-0000-0000-0000-0000000005b3',
   'Clienta B', 'history-clienta-b@test.local', '+50688880011');

INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2027-10-01 10:00+00', '2027-10-01 11:00+00',
   tstzrange('2027-10-01 10:00+00', '2027-10-01 11:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-0000000005ca', '00000000-0000-0000-0000-000000000e01', 'Completada', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-10-02 10:00+00', '2027-10-02 11:00+00',
   tstzrange('2027-10-02 10:00+00', '2027-10-02 11:15+00', '[)'), 'pending_approval',
   '00000000-0000-0000-0000-0000000005ca', '00000000-0000-0000-0000-000000000e02', 'Pendiente', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-10-03 10:00+00', '2027-10-03 11:00+00',
   tstzrange('2027-10-03 10:00+00', '2027-10-03 11:15+00', '[)'), 'no_show',
   '00000000-0000-0000-0000-0000000005ca', '00000000-0000-0000-0000-000000000e03', 'Ausencia', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-10-04 10:00+00', '2027-10-04 11:00+00',
   tstzrange('2027-10-04 10:00+00', '2027-10-04 11:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-0000000005cb', '00000000-0000-0000-0000-000000000e02', 'Completada de B', true, 1000, 0);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005b2","role":"authenticated"}', true);

SELECT is(public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000e01'), true,
  'una cita completada con esa técnica cuenta como historial');

SELECT is(public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000e02'), false,
  'una cita pendiente no cuenta, y la completada de otra clienta tampoco');

SELECT is(public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000e03'), false,
  'una ausencia no cuenta');

SELECT is(public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000bad'), false,
  'una técnica sin ninguna cita no tiene historial');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005b3","role":"authenticated"}', true);

SELECT is(public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000e01'), false,
  'la cita completada de otra clienta no es mi historial');

SELECT is(public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000e02'), true,
  'cada clienta ve solo el suyo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005b4","role":"authenticated"}', true);

SELECT is(public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000e01'), false,
  'una usuaria sin perfil de clienta no tiene historial');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005b5","role":"authenticated"}', true);

SELECT is(public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000e01'), false,
  'la administradora, que ve todas las citas, no hereda el historial de ninguna clienta');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_has_completed_appointment('00000000-0000-0000-0000-000000000e01')$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT pronargs::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'scheduling_has_completed_appointment'),
  1, 'la función solo recibe la técnica: la clienta sale de la sesión');

SELECT * FROM finish();
ROLLBACK;
