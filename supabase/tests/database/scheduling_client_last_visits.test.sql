BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000001ea1', 'last-visit-a@test.local'),
  ('00000000-0000-0000-0000-000000001ea2', 'last-visit-b@test.local'),
  ('00000000-0000-0000-0000-000000001ea9', 'last-visit-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000001ea9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000001ca1', '00000000-0000-0000-0000-000000001ea1',
   'Visita A', 'last-visit-a@test.local', '+50688881001'),
  ('00000000-0000-0000-0000-000000001ca2', '00000000-0000-0000-0000-000000001ea2',
   'Visita B', 'last-visit-b@test.local', '+50688881002'),
  ('00000000-0000-0000-0000-000000001ca3', NULL,
   'Visita C sin visitas', 'last-visit-c@test.local', '+50688881003');

INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-03-10 16:00+00', '2026-03-10 17:00+00',
   tstzrange('2026-03-10 16:00+00', '2026-03-10 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001ca1', '00000000-0000-0000-0000-000000001e01', 'Vieja', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-07-01 05:30+00', '2026-07-01 06:30+00',
   tstzrange('2026-07-01 05:30+00', '2026-07-01 06:45+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001ca1', '00000000-0000-0000-0000-000000001e01', 'Reciente', false, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-08-01 16:00+00', '2026-08-01 17:00+00',
   tstzrange('2026-08-01 16:00+00', '2026-08-01 17:15+00', '[)'), 'no_show',
   '00000000-0000-0000-0000-000000001ca1', '00000000-0000-0000-0000-000000001e01', 'Ausencia', false, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-09-01 16:00+00', '2027-09-01 17:00+00',
   tstzrange('2027-09-01 16:00+00', '2027-09-01 17:15+00', '[)'), 'confirmed',
   '00000000-0000-0000-0000-000000001ca1', '00000000-0000-0000-0000-000000001e01', 'Futura', false, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-05-15 16:00+00', '2026-05-15 17:00+00',
   tstzrange('2026-05-15 16:00+00', '2026-05-15 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001ca2', '00000000-0000-0000-0000-000000001e01', 'De B', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-06-01 16:00+00', '2026-06-01 17:00+00',
   tstzrange('2026-06-01 16:00+00', '2026-06-01 17:15+00', '[)'), 'cancelled',
   '00000000-0000-0000-0000-000000001ca3', '00000000-0000-0000-0000-000000001e01', 'Cancelada de C', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-10-01 16:00+00', '2026-10-01 17:00+00',
   tstzrange('2026-10-01 16:00+00', '2026-10-01 17:15+00', '[)'), 'completed',
   NULL, NULL, NULL, NULL, NULL, NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000001ea9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id, last_visit_at FROM public.scheduling_client_last_visits()
     WHERE client_id IN ('00000000-0000-0000-0000-000000001ca1', '00000000-0000-0000-0000-000000001ca2')
     ORDER BY client_id$$,
  $$VALUES ('00000000-0000-0000-0000-000000001ca1'::uuid, '2026-07-01 05:30+00'::timestamptz),
           ('00000000-0000-0000-0000-000000001ca2'::uuid, '2026-05-15 16:00+00'::timestamptz)$$,
  'la última visita es la cita completada más reciente; la ausencia y la cita futura no cuentan');

SELECT is(
  (SELECT count(*) FROM public.scheduling_client_last_visits()
    WHERE client_id = '00000000-0000-0000-0000-000000001ca3'),
  0::bigint, 'una clienta sin citas completadas no tiene fila');

SELECT is(
  (SELECT count(*) FROM public.scheduling_client_last_visits() WHERE client_id IS NULL),
  0::bigint, 'una cita completada sin clienta no es la visita de nadie');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000001ea2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id, last_visit_at FROM public.scheduling_client_last_visits()$$,
  $$VALUES ('00000000-0000-0000-0000-000000001ca2'::uuid, '2026-05-15 16:00+00'::timestamptz)$$,
  'una clienta solo ve su propia última visita: la RLS oculta las de las demás');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT * FROM public.scheduling_client_last_visits()$$, '42501', NULL,
  'un anónimo no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.scheduling_client_last_visits()'::regprocedure),
  false, 'corre con los permisos de quien llama, así que la RLS de las citas sigue decidiendo');

SELECT * FROM finish();
ROLLBACK;
