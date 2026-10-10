BEGIN;
SELECT plan(26);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'paquetes-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'paquetes-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000b1';

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
VALUES
  ('00000000-0000-0000-0000-00000000e001', 'zz-test paquete tecnica 1', 'lash_classic', 20000, 90, 5000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e002', 'zz-test paquete tecnica 2', 'brow_design', 10000, 45, 2000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e003', 'zz-test paquete tecnica 3', 'henna', 8000, 30, 1000, 'cuidados');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', 'zz-test paquete', 30000, true,
      ARRAY['00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000e002']::uuid[])$$,
  'admin: crea un paquete con catalog_save_package');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_package_techniques
    WHERE package_id = '00000000-0000-0000-0000-00000000d001'),
  2, 'admin: el paquete queda con sus dos técnicas');

SELECT lives_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', 'zz-test paquete editado', 32000, true,
      ARRAY['00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000e003']::uuid[])$$,
  'admin: edita el paquete y reemplaza sus técnicas');
SELECT is(
  (SELECT array_agg(technique_id ORDER BY technique_id) FROM public.catalog_package_techniques
    WHERE package_id = '00000000-0000-0000-0000-00000000d001'),
  ARRAY['00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000e003']::uuid[],
  'admin: las técnicas quedaron reemplazadas');

SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', 'zz-test paquete roto', 1, true,
      ARRAY['00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000ff']::uuid[])$$,
  '23503', NULL, 'admin: una técnica inexistente hace fallar el guardado');
SELECT is(
  (SELECT name FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d001'),
  'zz-test paquete editado', 'atómico: el nombre no cambió tras el fallo');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_package_techniques
    WHERE package_id = '00000000-0000-0000-0000-00000000d001'),
  2, 'atómico: el paquete conserva sus dos técnicas tras el fallo');

SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d002', 'zz-test paquete editado', 1000, true,
      ARRAY['00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000e002']::uuid[])$$,
  '23505', NULL, 'admin: un nombre repetido da unique_violation');

SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', 'zz-test paquete editado', 32000, true,
      ARRAY['00000000-0000-0000-0000-00000000e001']::uuid[])$$,
  '23514', NULL, 'invariante: una sola técnica se rechaza');
SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', 'zz-test paquete editado', 32000, true,
      ARRAY[]::uuid[])$$,
  '23514', NULL, 'invariante: sin técnicas se rechaza');
SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', 'zz-test paquete editado', 32000, true,
      ARRAY['00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000e002']::uuid[])$$,
  '23514', NULL, 'invariante: técnicas repetidas se rechazan');
SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', '   ', 32000, true,
      ARRAY['00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000e003']::uuid[])$$,
  '23514', NULL, 'invariante: nombre vacío se rechaza');
SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', E'\t\n', 32000, true,
      ARRAY['00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000e003']::uuid[])$$,
  '23514', NULL, 'invariante: nombre de solo tabs o saltos de línea se rechaza');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_package_techniques
    WHERE package_id = '00000000-0000-0000-0000-00000000d001'),
  2, 'invariante: tras los rechazos el paquete conserva sus dos técnicas');
SELECT is(
  (SELECT has_function_privilege('anon', 'public.catalog_save_package(uuid, text, bigint, boolean, uuid[])', 'EXECUTE')),
  false, 'permisos: CREATE OR REPLACE conserva la función cerrada para anon');

UPDATE public.catalog_packages SET is_active = false
 WHERE id = '00000000-0000-0000-0000-00000000d001';
SELECT is(
  (SELECT is_active FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d001'),
  false, 'admin: UPDATE directo desactiva el paquete');

DELETE FROM public.catalog_package_techniques
 WHERE package_id = '00000000-0000-0000-0000-00000000d001'
   AND technique_id = '00000000-0000-0000-0000-00000000e003';
SELECT is(
  (SELECT count(*)::int FROM public.catalog_package_techniques
    WHERE package_id = '00000000-0000-0000-0000-00000000d001'),
  1, 'admin: DELETE directo en la tabla puente permitido');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), false, 'clienta: auth_is_staff() es false');
SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d003', 'zz-test clienta', 1000, true,
      ARRAY['00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000e002']::uuid[])$$,
  '42501', NULL, 'clienta: catalog_save_package denegado por RLS');
SELECT throws_ok(
  $$SELECT public.catalog_save_package(
      '00000000-0000-0000-0000-00000000d001', 'zz-test robado', 1, true,
      ARRAY['00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000e002']::uuid[])$$,
  '42501', NULL, 'clienta: no puede sobrescribir un paquete existente');
SELECT is(
  (SELECT name FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d001'),
  'zz-test paquete editado', 'clienta: el paquete no cambió');

SELECT throws_ok(
  $$SELECT public.catalog_delete_package('00000000-0000-0000-0000-00000000d001')$$,
  '42501', NULL, 'clienta: catalog_delete_package denegado por RLS');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d001'),
  1, 'clienta: el paquete sigue existiendo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.catalog_delete_package('00000000-0000-0000-0000-00000000d001')$$,
  'admin: elimina el paquete con catalog_delete_package');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d001'),
  0, 'admin: el paquete ya no existe');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_package_techniques
    WHERE package_id = '00000000-0000-0000-0000-00000000d001'),
  0, 'admin: no quedan filas huérfanas en la tabla puente');

SELECT * FROM finish();
ROLLBACK;
