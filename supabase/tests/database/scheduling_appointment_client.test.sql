BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000003ea1', 'appointment-client-a@test.local'),
  ('00000000-0000-0000-0000-000000003ea2', 'appointment-client-b@test.local'),
  ('00000000-0000-0000-0000-000000003ea9', 'appointment-client-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000003ea9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000003ca1', '00000000-0000-0000-0000-000000003ea1',
   'Dueña A', 'appointment-client-a@test.local', '+50688883001'),
  ('00000000-0000-0000-0000-000000003ca2', '00000000-0000-0000-0000-000000003ea2',
   'Dueña B', 'appointment-client-b@test.local', '+50688883002');

INSERT INTO public.scheduling_appointments
  (id, resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000003a01', '00000000-0000-0000-0000-000000000a01',
   '2026-04-10 16:00+00', '2026-04-10 17:00+00',
   tstzrange('2026-04-10 16:00+00', '2026-04-10 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000003ca1', '00000000-0000-0000-0000-000000001e01', 'De A', true, 1000, 0),
  ('00000000-0000-0000-0000-000000003a02', '00000000-0000-0000-0000-000000000a01',
   '2026-04-11 16:00+00', '2026-04-11 17:00+00',
   tstzrange('2026-04-11 16:00+00', '2026-04-11 17:15+00', '[)'), 'cancelled',
   '00000000-0000-0000-0000-000000003ca2', '00000000-0000-0000-0000-000000001e01', 'De B', true, 1000, 0),
  ('00000000-0000-0000-0000-000000003a03', '00000000-0000-0000-0000-000000000a01',
   '2026-04-12 16:00+00', '2026-04-12 17:00+00',
   tstzrange('2026-04-12 16:00+00', '2026-04-12 17:15+00', '[)'), 'completed',
   NULL, NULL, NULL, NULL, NULL, NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000003ea9","role":"authenticated"}', true);

SELECT is(
  public.scheduling_appointment_client('00000000-0000-0000-0000-000000003a01'),
  '00000000-0000-0000-0000-000000003ca1'::uuid,
  'la administradora recibe la clienta de una cita completada');

SELECT is(
  public.scheduling_appointment_client('00000000-0000-0000-0000-000000003a02'),
  '00000000-0000-0000-0000-000000003ca2'::uuid,
  'la administradora recibe la clienta de una cita cancelada: el estado no importa');

SELECT is(
  public.scheduling_appointment_client('00000000-0000-0000-0000-000000003aff'),
  NULL::uuid,
  'una cita que no existe no es de ninguna clienta');

SELECT is(
  public.scheduling_appointment_client('00000000-0000-0000-0000-000000003a03'),
  NULL::uuid,
  'una cita creada por el personal, sin clienta, no es de ninguna clienta');

SELECT is(
  public.scheduling_appointment_client(NULL),
  NULL::uuid,
  'un id nulo no es la cita de nadie');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000003ea2","role":"authenticated"}', true);

SELECT is(
  public.scheduling_appointment_client('00000000-0000-0000-0000-000000003a02'),
  '00000000-0000-0000-0000-000000003ca2'::uuid,
  'una clienta recibe su propio id con su propia cita');

SELECT is(
  public.scheduling_appointment_client('00000000-0000-0000-0000-000000003a01'),
  NULL::uuid,
  'una clienta recibe nulo con la cita de otra: la RLS se la oculta');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.scheduling_appointment_client('00000000-0000-0000-0000-000000003a01')$$,
  '42501', NULL,
  'un anónimo no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.scheduling_appointment_client(uuid)'::regprocedure),
  false,
  'corre con los permisos de quien llama, así que la RLS de las citas sigue decidiendo');

SELECT * FROM finish();
ROLLBACK;
