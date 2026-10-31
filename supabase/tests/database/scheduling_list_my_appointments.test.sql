-- US-AGE-06 · «mis citas»: cada clienta lee solo las suyas, por una función que no depende de la RLS.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000d02', 'mine-a@test.local'),
  ('00000000-0000-0000-0000-000000000d03', 'mine-b@test.local'),
  ('00000000-0000-0000-0000-000000000d05', 'mine-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000d05';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000000dc6', '00000000-0000-0000-0000-000000000d02',
   'Clienta A', 'mine-a@test.local', '+50688880066'),
  ('00000000-0000-0000-0000-000000000dc7', '00000000-0000-0000-0000-000000000d03',
   'Clienta B', 'mine-b@test.local', '+50688880067');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-00000000da01', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '40 days', now() + interval '40 days 1 hour',
   tstzrange(now() + interval '40 days', now() + interval '40 days 1 hour'),
   '00000000-0000-0000-0000-000000000dc6', '00000000-0000-0000-0000-000000000df4', 'zz-test mia 2',
   true, 35000, 10000),
  ('00000000-0000-0000-0000-00000000da02', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() + interval '30 days', now() + interval '30 days 1 hour',
   tstzrange(now() + interval '30 days', now() + interval '30 days 1 hour'),
   '00000000-0000-0000-0000-000000000dc6', '00000000-0000-0000-0000-000000000df4', 'zz-test mia 1',
   false, 25000, 10000),
  ('00000000-0000-0000-0000-00000000da03', '00000000-0000-0000-0000-000000000a01', 'rejected',
   now() + interval '31 days', now() + interval '31 days 1 hour',
   tstzrange(now() + interval '31 days', now() + interval '31 days 1 hour'),
   '00000000-0000-0000-0000-000000000dc6', '00000000-0000-0000-0000-000000000df4', 'zz-test rechazada',
   true, 35000, 10000),
  ('00000000-0000-0000-0000-00000000da04', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '3 hours', now() - interval '2 hours',
   tstzrange(now() - interval '3 hours', now() - interval '2 hours'),
   '00000000-0000-0000-0000-000000000dc6', '00000000-0000-0000-0000-000000000df4', 'zz-test pasada',
   true, 35000, 10000),
  ('00000000-0000-0000-0000-00000000da05', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '35 days', now() + interval '35 days 1 hour',
   tstzrange(now() + interval '35 days', now() + interval '35 days 1 hour'),
   '00000000-0000-0000-0000-000000000dc7', '00000000-0000-0000-0000-000000000df4', 'zz-test de la otra',
   true, 35000, 10000);

-- Cita de paquete (US-AGE-04): sin técnica ni primera vez, el nombre sale de package_name.
INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, package_id, package_name,
   service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-00000000da06', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '45 days', now() + interval '45 days 2 hours',
   tstzrange(now() + interval '45 days', now() + interval '45 days 2 hours'),
   '00000000-0000-0000-0000-000000000dc6', '00000000-0000-0000-0000-00000000db01', 'zz-test paquete mio',
   45000, 12000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT technique_name FROM public.scheduling_list_my_appointments(now(), 50)$$,
  $$VALUES ('zz-test mia 1'), ('zz-test mia 2'), ('zz-test paquete mio')$$,
  'la clienta ve solo sus citas activas y futuras, las más próximas primero (incluida la de paquete, por su nombre)');

SELECT is(
  (SELECT is_first_time FROM public.scheduling_list_my_appointments(now(), 50)
    WHERE technique_name = 'zz-test paquete mio'),
  NULL::boolean,
  'una cita de paquete no tiene primera vez ni retoque');

SELECT is((SELECT count(*) FROM public.scheduling_list_my_appointments(now(), 50)
            WHERE technique_name IN ('zz-test rechazada', 'zz-test pasada', 'zz-test de la otra')), 0::bigint,
  'no ve una rechazada, una que ya pasó ni la cita de otra clienta');

SELECT results_eq(
  $$SELECT id, status, is_first_time, service_price, deposit_required
      FROM public.scheduling_list_my_appointments(now(), 1)$$,
  $$VALUES ('00000000-0000-0000-0000-00000000da02'::uuid, 'pending_approval', false, 25000::bigint, 10000::bigint)$$,
  'el tope pedido se respeta y trae las columnas que la pantalla muestra');

SELECT is((SELECT count(*) FROM public.scheduling_list_my_appointments(now(), 0)), 0::bigint,
  'un tope de cero no devuelve nada');

SELECT is((SELECT count(*) FROM public.scheduling_list_my_appointments(now(), NULL)), 3::bigint,
  'sin tope usa el tope por defecto');

SELECT is((SELECT count(*) FROM public.scheduling_list_my_appointments(now() + interval '36 days', 50)), 2::bigint,
  'solo cuenta las citas que empiezan después de la hora que se le da (mia 2 y la de paquete)');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d03","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT technique_name FROM public.scheduling_list_my_appointments(now(), 50)$$,
  $$VALUES ('zz-test de la otra')$$,
  'la otra clienta ve solo la suya');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d05","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.scheduling_list_my_appointments(now(), 50)), 0::bigint,
  'una administradora sin perfil de clienta no ve ninguna: la función no es una lectura de toda la agenda');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_list_my_appointments(now(), 50)$$,
  '42501', NULL, 'un anónimo no ejecuta la función');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.scheduling_appointments
            WHERE id IN ('00000000-0000-0000-0000-00000000da01', '00000000-0000-0000-0000-00000000da02')), 2::bigint,
  'leer no cambia ninguna cita');

SELECT is((SELECT count(*) FROM public.audit_events
            WHERE entity_id IN ('00000000-0000-0000-0000-00000000da01', '00000000-0000-0000-0000-00000000da02')), 0::bigint,
  'leer no deja nada en la bitácora');

SELECT * FROM finish();
ROLLBACK;
