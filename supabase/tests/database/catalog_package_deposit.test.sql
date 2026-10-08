BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email) VALUES
 ('00000000-0000-0000-0000-0000000000c1', 'anticipo-admin@test.local'),
 ('00000000-0000-0000-0000-0000000000c2', 'anticipo-clienta@test.local');
UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000c1';
INSERT INTO public.catalog_techniques
 (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
VALUES
 ('00000000-0000-0000-0000-00000000e011', 'zz-anticipo técnica 1', 'lash_classic', 20000, 90, 5000, 'cuidados'),
 ('00000000-0000-0000-0000-00000000e012', 'zz-anticipo técnica 2', 'brow_design', 10000, 45, 2000, 'cuidados');

CREATE FUNCTION pg_temp.guardar_anticipo(monto bigint) RETURNS void
LANGUAGE sql SECURITY INVOKER AS $$
 SELECT public.catalog_save_package_with_deposit(
  '00000000-0000-0000-0000-00000000d011', 'zz-anticipo paquete', 30000, true,
  ARRAY['00000000-0000-0000-0000-00000000e011','00000000-0000-0000-0000-00000000e012']::uuid[], monto);
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
 '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
SELECT lives_ok('SELECT pg_temp.guardar_anticipo(9000)', 'staff crea el anticipo propio del paquete');
SELECT is((SELECT deposit FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d011'),
 9000::bigint, 'el anticipo guardado no es la suma de anticipos de técnicas');
SELECT lives_ok('SELECT pg_temp.guardar_anticipo(11000)', 'staff edita el anticipo');
SELECT is((SELECT deposit FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d011'),
 11000::bigint, 'otra lectura obtiene el anticipo editado');
SELECT throws_ok('SELECT pg_temp.guardar_anticipo(-1)', '23514', NULL, 'rechaza anticipos negativos');
SELECT throws_ok('SELECT pg_temp.guardar_anticipo(NULL)', '23514', NULL, 'rechaza anticipos nulos');
SELECT is((SELECT deposit FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d011'),
 11000::bigint, 'los intentos inválidos conservan el anticipo');
SELECT lives_ok($$SELECT public.catalog_save_package(
 '00000000-0000-0000-0000-00000000d011', 'zz-anticipo paquete anterior', 31000, false,
 ARRAY['00000000-0000-0000-0000-00000000e011','00000000-0000-0000-0000-00000000e012']::uuid[])$$,
 'el RPC previo puede editar y desactivar');
SELECT is((SELECT deposit FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d011'),
 11000::bigint, 'el RPC previo y la desactivación conservan el anticipo');
SELECT lives_ok('SELECT pg_temp.guardar_anticipo(0)', 'staff puede configurar sin anticipo');

SELECT set_config('request.jwt.claims',
 '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
SELECT throws_ok('SELECT pg_temp.guardar_anticipo(500)', '42501', NULL, 'una clienta no cambia el anticipo');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok('SELECT pg_temp.guardar_anticipo(500)', '42501', NULL, 'anónimos no cambian el anticipo');
RESET ROLE;
SELECT is((SELECT deposit FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d011'),
 0::bigint, 'las escrituras denegadas no alteran el anticipo');
SELECT * FROM finish();
ROLLBACK;
