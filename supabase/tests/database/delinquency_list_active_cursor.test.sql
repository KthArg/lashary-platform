-- delinquency_list_active_cursor.test.sql
-- US-MOR-01 · feature delinquency — el cursor (since, client_id) del listado de activas.
-- Tres clientas con la MISMA marca de tiempo (como las que genera una misma corrida de detección) y una
-- más antigua: paginar de a dos no pierde a ninguna ni repite a ninguna. Todo se deshace con ROLLBACK
-- (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000000b1', 'cursor-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000b1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cb01', NULL, 'Empate uno', 'cb01@test.local', '00000000061'),
  ('00000000-0000-0000-0000-00000000cb02', NULL, 'Empate dos', 'cb02@test.local', '00000000062'),
  ('00000000-0000-0000-0000-00000000cb03', NULL, 'Empate tres', 'cb03@test.local', '00000000063'),
  ('00000000-0000-0000-0000-00000000cb04', NULL, 'Más antigua', 'cb04@test.local', '00000000064');

-- cb01, cb02 y cb03 comparten el instante de la corrida; cb04 es de hace una semana.
INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-00000000cb01', '00000000-0000-0000-0000-00000000b001', 1000, 'active',
   '2026-11-01 10:00:00+00', now(), '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000cb02', '00000000-0000-0000-0000-00000000b002', 2000, 'active',
   '2026-11-01 10:00:00+00', now(), '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000cb03', '00000000-0000-0000-0000-00000000b003', 3000, 'active',
   '2026-11-01 10:00:00+00', now(), '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000cb04', '00000000-0000-0000-0000-00000000b004', 4000, 'active',
   '2026-10-25 10:00:00+00', now(), '00000000-0000-0000-0000-0000000000b1');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT client_id FROM public.delinquency_list_active(2)$$,
  $$VALUES ('00000000-0000-0000-0000-00000000cb01'::uuid), ('00000000-0000-0000-0000-00000000cb02'::uuid)$$,
  'la primera página trae las dos primeras de las que empatan, ordenadas por clienta');

SELECT results_eq(
  $$SELECT client_id FROM public.delinquency_list_active(
      2, '2026-11-01 10:00:00+00', '00000000-0000-0000-0000-00000000cb02')$$,
  $$VALUES ('00000000-0000-0000-0000-00000000cb03'::uuid), ('00000000-0000-0000-0000-00000000cb04'::uuid)$$,
  'la segunda página sigue con la tercera que empata y no se la salta');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_list_active(
     2, '2026-11-01 10:00:00+00', '00000000-0000-0000-0000-00000000cb03')),
  1, 'con el cursor en la última que empata, solo queda la más antigua');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_list_active(
     10, '2026-10-25 10:00:00+00', '00000000-0000-0000-0000-00000000cb04')),
  0, 'con el cursor en la última fila no queda nada');

SELECT results_eq(
  $$SELECT client_id FROM public.delinquency_list_active(10, '2026-11-01 10:00:00+00')$$,
  $$VALUES ('00000000-0000-0000-0000-00000000cb01'::uuid), ('00000000-0000-0000-0000-00000000cb02'::uuid),
           ('00000000-0000-0000-0000-00000000cb03'::uuid), ('00000000-0000-0000-0000-00000000cb04'::uuid)$$,
  'sin el id del cursor, los empates con la fecha entran todos (el id es opcional)');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_list_active(10)$$,
  '42501', NULL, 'anon sigue sin poder consultar el listado');

SELECT * FROM finish();
ROLLBACK;
