BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000002ea1', 'list-a@test.local'),
  ('00000000-0000-0000-0000-000000002ea9', 'list-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000002ea9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000002ca1', '00000000-0000-0000-0000-000000002ea1',
   'Ana Lista', 'list-a@test.local', '+50688882001'),
  ('00000000-0000-0000-0000-000000002ca2', NULL,
   'Bea Lista', 'list-b@test.local', '+50688882002'),
  ('00000000-0000-0000-0000-000000002ca3', NULL,
   'Carla Lista', 'list-c@test.local', '+50688882003'),
  ('00000000-0000-0000-0000-000000002ca4', NULL,
   'Daniela Lista', 'list-d@test.local', '+50688882004');

INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-07-01 05:30+00', '2026-07-01 06:30+00',
   tstzrange('2026-07-01 05:30+00', '2026-07-01 06:45+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000002ca1', '00000000-0000-0000-0000-000000002e01', 'De Ana', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-05-15 16:00+00', '2026-05-15 17:00+00',
   tstzrange('2026-05-15 16:00+00', '2026-05-15 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000002ca2', '00000000-0000-0000-0000-000000002e01', 'De Bea', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-04-01 05:30+00', '2026-04-01 06:30+00',
   tstzrange('2026-04-01 05:30+00', '2026-04-01 06:45+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000002ca4', '00000000-0000-0000-0000-000000002e01', 'De Daniela', true, 1000, 0);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000002ea9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT full_name, last_visit_at FROM public.clients_list(NULL, NULL, NULL)
     WHERE full_name LIKE '% Lista' ORDER BY full_name$$,
  $$VALUES ('Ana Lista'::text, '2026-07-01 05:30+00'::timestamptz),
           ('Bea Lista'::text, '2026-05-15 16:00+00'::timestamptz),
           ('Carla Lista'::text, NULL::timestamptz),
           ('Daniela Lista'::text, '2026-04-01 05:30+00'::timestamptz)$$,
  'sin filtros trae a todas, con su última visita, y la que nunca vino sin fecha');

SELECT results_eq(
  $$SELECT full_name FROM public.clients_list(NULL, '2026-04-01', '2026-06-30')
     WHERE full_name LIKE '% Lista' ORDER BY full_name$$,
  $$VALUES ('Ana Lista'::text), ('Bea Lista'::text)$$,
  'el rango es inclusivo y en la fecha del estudio: el 30 de junio a las 23:30 entra');

SELECT results_eq(
  $$SELECT full_name FROM public.clients_list(NULL, '2026-03-31', '2026-03-31')
     WHERE full_name LIKE '% Lista'$$,
  $$VALUES ('Daniela Lista'::text)$$,
  'una visita a las 5:30 UTC del 1 de abril cae el 31 de marzo en la hora del estudio');

SELECT is(
  (SELECT count(*) FROM public.clients_list(NULL, '2026-07-01', NULL) WHERE full_name LIKE '% Lista'),
  0::bigint, 'desde el 1 de julio no entra Ana, aunque en UTC su visita ya era el 1 de julio');

SELECT results_eq(
  $$SELECT full_name FROM public.clients_list(NULL, '2026-05-01', NULL)
     WHERE full_name LIKE '% Lista' ORDER BY full_name$$,
  $$VALUES ('Ana Lista'::text), ('Bea Lista'::text)$$,
  'solo con desde, el rango queda abierto hacia adelante');

SELECT results_eq(
  $$SELECT full_name FROM public.clients_list(NULL, NULL, '2026-05-15')
     WHERE full_name LIKE '% Lista' ORDER BY full_name$$,
  $$VALUES ('Bea Lista'::text), ('Daniela Lista'::text)$$,
  'solo con hasta, el rango queda abierto hacia atrás');

SELECT is(
  (SELECT count(*) FROM public.clients_list(NULL, NULL, '2030-12-31') WHERE full_name = 'Carla Lista'),
  0::bigint, 'una clienta sin visitas no entra en ningún rango');

SELECT results_eq(
  $$SELECT full_name FROM public.clients_list('%dani%', '2026-01-01', '2026-12-31')$$,
  $$VALUES ('Daniela Lista'::text)$$,
  'el nombre y el rango se combinan');

SELECT is(
  (SELECT count(*) FROM public.clients_list(NULL, '2026-06-30', '2026-04-01')),
  0::bigint, 'un rango al revés no devuelve filas');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000002ea1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT full_name FROM public.clients_list(NULL, NULL, NULL)$$,
  $$VALUES ('Ana Lista'::text)$$,
  'una clienta solo se ve a sí misma: la RLS de los perfiles sigue decidiendo');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT * FROM public.clients_list(NULL, NULL, NULL)$$, '42501', NULL,
  'un anónimo no ejecuta el listado');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
