BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000008b1', 'aftercare-clienta@test.local');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, buffer_min, deposit,
   aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000008f1', 'zz-cuidado técnica B', 'lash_classic',
   20000, 90, 15, 5000, 'cuidados de B', true),
  ('00000000-0000-0000-0000-0000000008f2', 'zz-cuidado técnica A', 'brow_design',
   10000, 45, 10, 2000, 'cuidados de A', true),
  ('00000000-0000-0000-0000-0000000008f3', 'zz-cuidado técnica desactivada', 'lips',
   8000, 30, 5, 0, 'cuidados de la desactivada', false);

INSERT INTO public.catalog_packages (id, name, price, deposit, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000008d1', 'zz-cuidado paquete activo', 25000, 7000, true),
  ('00000000-0000-0000-0000-0000000008d2', 'zz-cuidado paquete desactivado', 25000, 7000, false);

INSERT INTO public.catalog_package_techniques (package_id, technique_id) VALUES
  ('00000000-0000-0000-0000-0000000008d1', '00000000-0000-0000-0000-0000000008f1'),
  ('00000000-0000-0000-0000-0000000008d1', '00000000-0000-0000-0000-0000000008f2'),
  ('00000000-0000-0000-0000-0000000008d2', '00000000-0000-0000-0000-0000000008f1'),
  ('00000000-0000-0000-0000-0000000008d2', '00000000-0000-0000-0000-0000000008f3');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008b1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT technique_name, aftercare_text
      FROM public.catalog_service_aftercare('00000000-0000-0000-0000-0000000008f1', NULL)$$,
  $$VALUES ('zz-cuidado técnica B'::text, 'cuidados de B'::text)$$,
  'técnica activa: devuelve una fila con su nombre y su texto de cuidados');

SELECT results_eq(
  $$SELECT technique_name, aftercare_text
      FROM public.catalog_service_aftercare('00000000-0000-0000-0000-0000000008f3', NULL)$$,
  $$VALUES ('zz-cuidado técnica desactivada'::text, 'cuidados de la desactivada'::text)$$,
  'técnica desactivada: devuelve igual su texto, la cita se cerró después de reservarse');

SELECT results_eq(
  $$SELECT technique_name, aftercare_text
      FROM public.catalog_service_aftercare(NULL, '00000000-0000-0000-0000-0000000008d1')$$,
  $$VALUES ('zz-cuidado técnica A'::text, 'cuidados de A'::text),
           ('zz-cuidado técnica B'::text, 'cuidados de B'::text)$$,
  'paquete: una fila por técnica incluida, en orden de nombre de técnica');

SELECT results_eq(
  $$SELECT technique_name
      FROM public.catalog_service_aftercare(NULL, '00000000-0000-0000-0000-0000000008d2')$$,
  $$VALUES ('zz-cuidado técnica B'::text), ('zz-cuidado técnica desactivada'::text)$$,
  'paquete desactivado: devuelve igual las técnicas que incluye, también la desactivada');

SELECT is_empty(
  $$SELECT * FROM public.catalog_service_aftercare(
      '00000000-0000-0000-0000-0000000008f1', '00000000-0000-0000-0000-0000000008d1')$$,
  'con la técnica y el paquete a la vez no devuelve filas');

SELECT is_empty(
  $$SELECT * FROM public.catalog_service_aftercare(NULL, NULL)$$,
  'sin técnica ni paquete no devuelve filas');

SELECT is_empty(
  $$SELECT * FROM public.catalog_service_aftercare('00000000-0000-0000-0000-00000000bad0', NULL)
    UNION ALL
    SELECT * FROM public.catalog_service_aftercare(NULL, '00000000-0000-0000-0000-00000000bad1')$$,
  'una técnica o un paquete que no existen no devuelven filas');

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'catalog_service_aftercare' AND p.prosecdef),
  0, 'la función corre con los permisos de quien la llama, no los eleva');

SELECT lives_ok(
  $$SELECT * FROM public.catalog_service_aftercare('00000000-0000-0000-0000-0000000008f1', NULL)$$,
  'una clienta autenticada sí puede ejecutar la función');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.catalog_service_aftercare('00000000-0000-0000-0000-0000000008f1', NULL)$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
