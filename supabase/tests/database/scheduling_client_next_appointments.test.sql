-- scheduling_client_next_appointments.test.sql
-- US-NOT-06 · scheduling — la próxima cita de cada clienta (contrato: docs/contracts/scheduling-api.md):
-- la más cercana entre las futuras que siguen en pie (pending_approval, approved, confirmed). Una cita pasada,
-- rechazada, cancelada o en ausencia no cuenta; la cita sin clienta no sale; la RLS decide qué se ve (SEC-002).
-- Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000026a1', 'proxima-a@test.local'),
  ('00000000-0000-0000-0000-0000000026a2', 'proxima-b@test.local'),
  ('00000000-0000-0000-0000-0000000026a9', 'proxima-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000026a9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000026c1', '00000000-0000-0000-0000-0000000026a1',
   'Próxima A', 'proxima-a@test.local', '+50688882601'),
  ('00000000-0000-0000-0000-0000000026c2', '00000000-0000-0000-0000-0000000026a2',
   'Próxima B', 'proxima-b@test.local', '+50688882602'),
  ('00000000-0000-0000-0000-0000000026c3', NULL,
   'Próxima C sin citas en pie', 'proxima-c@test.local', '+50688882603');

-- A: una pasada aprobada, dos futuras en pie (gana la más cercana) y una futura cancelada más cercana todavía.
-- B: una futura pendiente y una futura confirmada más lejana.
-- C: una futura rechazada, una futura en ausencia y una pasada completada: ninguna cuenta.
INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
SELECT '00000000-0000-0000-0000-000000000a01', s, s + interval '1 hour',
       tstzrange(s, s + interval '75 minutes', '[)'), st, c, '00000000-0000-0000-0000-000000001e01', n, false, 1000, 0
  FROM (VALUES
    (date_trunc('hour', now()) - interval '20 days', 'approved',         '00000000-0000-0000-0000-0000000026c1'::uuid, 'Pasada de A'),
    (date_trunc('hour', now()) + interval '30 days', 'confirmed',        '00000000-0000-0000-0000-0000000026c1'::uuid, 'Lejana de A'),
    (date_trunc('hour', now()) + interval '10 days', 'approved',         '00000000-0000-0000-0000-0000000026c1'::uuid, 'Cercana de A'),
    (date_trunc('hour', now()) + interval '5 days',  'cancelled',        '00000000-0000-0000-0000-0000000026c1'::uuid, 'Cancelada de A'),
    (date_trunc('hour', now()) + interval '12 days', 'pending_approval', '00000000-0000-0000-0000-0000000026c2'::uuid, 'Pendiente de B'),
    (date_trunc('hour', now()) + interval '40 days', 'confirmed',        '00000000-0000-0000-0000-0000000026c2'::uuid, 'Confirmada de B'),
    (date_trunc('hour', now()) + interval '15 days', 'rejected',         '00000000-0000-0000-0000-0000000026c3'::uuid, 'Rechazada de C'),
    (date_trunc('hour', now()) + interval '16 days', 'no_show',          '00000000-0000-0000-0000-0000000026c3'::uuid, 'Ausencia de C'),
    (date_trunc('hour', now()) - interval '25 days', 'completed',        '00000000-0000-0000-0000-0000000026c3'::uuid, 'Completada de C')
  ) AS v(s, st, c, n);

INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', date_trunc('hour', now()) + interval '20 days',
   date_trunc('hour', now()) + interval '20 days 1 hour',
   tstzrange(date_trunc('hour', now()) + interval '20 days', date_trunc('hour', now()) + interval '20 days 75 minutes', '[)'),
   'approved', NULL, NULL, NULL, NULL, NULL, NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000026a9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id, next_appointment_at FROM public.scheduling_client_next_appointments()
     WHERE client_id IN ('00000000-0000-0000-0000-0000000026c1', '00000000-0000-0000-0000-0000000026c2')
     ORDER BY client_id$$,
  $$VALUES ('00000000-0000-0000-0000-0000000026c1'::uuid, date_trunc('hour', now()) + interval '10 days'),
           ('00000000-0000-0000-0000-0000000026c2'::uuid, date_trunc('hour', now()) + interval '12 days')$$,
  'la próxima cita es la futura en pie más cercana; la pasada y la cancelada no cuentan');

SELECT is(
  (SELECT count(*) FROM public.scheduling_client_next_appointments()
    WHERE client_id = '00000000-0000-0000-0000-0000000026c3'),
  0::bigint, 'una clienta con solo citas rechazadas, en ausencia o pasadas no tiene fila');

SELECT is(
  (SELECT count(*) FROM public.scheduling_client_next_appointments() WHERE client_id IS NULL),
  0::bigint, 'una cita futura sin clienta no es la próxima cita de nadie');

SELECT ok(
  (SELECT count(*) FROM public.scheduling_client_next_appointments()) =
  (SELECT count(DISTINCT client_id) FROM public.scheduling_client_next_appointments()),
  'una sola fila por clienta');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000026a2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id FROM public.scheduling_client_next_appointments()$$,
  $$VALUES ('00000000-0000-0000-0000-0000000026c2'::uuid)$$,
  'una clienta solo ve su propia próxima cita: la RLS oculta las de las demás');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT * FROM public.scheduling_client_next_appointments()$$, '42501', NULL,
  'un anónimo no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.scheduling_client_next_appointments()'::regprocedure),
  false, 'corre con los permisos de quien llama, así que la RLS de las citas sigue decidiendo');

SELECT is(
  (SELECT provolatile FROM pg_proc WHERE oid = 'public.scheduling_client_next_appointments()'::regprocedure),
  's', 'es STABLE: lee now() de la transacción y no escribe');

SELECT * FROM finish();
ROLLBACK;
