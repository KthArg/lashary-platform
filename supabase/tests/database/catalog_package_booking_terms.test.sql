-- US-AGE-04 · catalog — contrato SQL que usará la reserva de paquetes: condiciones del paquete y
-- de cada técnica incluida.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000006b1', 'package-terms-clienta@test.local');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, buffer_min, deposit,
   aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000006f1', 'zz-paquete técnica 1', 'lash_classic',
   20000, 90, 15, 5000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000006f2', 'zz-paquete técnica 2', 'brow_design',
   10000, 45, 10, 2000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000006f3', 'zz-paquete técnica desactivada', 'lips',
   8000, 30, 5, 0, 'cuidados', false);

INSERT INTO public.catalog_packages (id, name, price, deposit, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000006d1', 'zz-paquete activo', 25000, 7000, true),
  ('00000000-0000-0000-0000-0000000006d2', 'zz-paquete inactivo', 25000, 7000, false),
  ('00000000-0000-0000-0000-0000000006d3', 'zz-paquete con técnica desactivada', 15000, 0, true),
  ('00000000-0000-0000-0000-0000000006d4', 'zz-paquete con promo vigente', 10000, 0, true),
  ('00000000-0000-0000-0000-0000000006d5', 'zz-paquete con promo vencida y pausada', 10000, 0, true);

INSERT INTO public.catalog_package_techniques (package_id, technique_id) VALUES
  ('00000000-0000-0000-0000-0000000006d1', '00000000-0000-0000-0000-0000000006f1'),
  ('00000000-0000-0000-0000-0000000006d1', '00000000-0000-0000-0000-0000000006f2'),
  ('00000000-0000-0000-0000-0000000006d2', '00000000-0000-0000-0000-0000000006f1'),
  ('00000000-0000-0000-0000-0000000006d3', '00000000-0000-0000-0000-0000000006f3'),
  ('00000000-0000-0000-0000-0000000006d4', '00000000-0000-0000-0000-0000000006f1'),
  ('00000000-0000-0000-0000-0000000006d5', '00000000-0000-0000-0000-0000000006f1');

-- US-PROM-01: dos promociones vigentes a la vez sobre el mismo paquete (el esquema no lo
-- impide) — gana la de mayor descuento (D-PROM-3). Las otras dos (vencida y pausada) prueban
-- que catalog_package_booking_terms nunca las aplica.
INSERT INTO public.catalog_promotions (id, package_id, discount_percent, starts_at, ends_at, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000007f1', '00000000-0000-0000-0000-0000000006d4', 20,
    now() - interval '1 day', now() + interval '1 day', true),
  ('00000000-0000-0000-0000-0000000007f2', '00000000-0000-0000-0000-0000000006d4', 10,
    now() - interval '1 day', now() + interval '1 day', true),
  ('00000000-0000-0000-0000-0000000007f3', '00000000-0000-0000-0000-0000000006d5', 50,
    now() - interval '10 day', now() - interval '1 day', true),
  ('00000000-0000-0000-0000-0000000007f4', '00000000-0000-0000-0000-0000000006d5', 50,
    now() - interval '1 day', now() + interval '1 day', false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006b1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT package_name, package_price, deposit, technique_name, duration_min, buffer_min
      FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d1')
     ORDER BY technique_name$$,
  $$VALUES
      ('zz-paquete activo'::text, 25000::bigint, 7000::bigint, 'zz-paquete técnica 1'::text, 90, 15),
      ('zz-paquete activo'::text, 25000::bigint, 7000::bigint, 'zz-paquete técnica 2'::text, 45, 10)$$,
  'paquete activo: una fila por técnica incluida, con el precio y el anticipo del paquete repetidos');

SELECT is(
  (SELECT count(*)::int FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d1')),
  2, 'devuelve exactamente dos técnicas para el paquete de dos técnicas');

SELECT is(
  (SELECT sum(duration_min + buffer_min)::int
     FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d1')),
  160, 'la suma de duración más limpieza de las técnicas incluidas es la del criterio 2');

SELECT is_empty(
  $$SELECT * FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d2')$$,
  'un paquete desactivado no se ofrece');

SELECT is_empty(
  $$SELECT * FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-00000000bad0')$$,
  'un paquete que no existe no devuelve nada');

SELECT isnt_empty(
  $$SELECT * FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d3')$$,
  'un paquete activo con una técnica incluida desactivada igual devuelve esa técnica (sin filtrar)');

SELECT is(
  (SELECT technique_name FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d3')),
  'zz-paquete técnica desactivada'::text,
  'la técnica desactivada incluida mantiene su nombre, igual que durationTotalMin en TS');

SELECT results_eq(
  $$SELECT package_price, promotion_id, discount_percent
      FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d4')$$,
  $$VALUES (8000::bigint, '00000000-0000-0000-0000-0000000007f1'::uuid, 20)$$,
  'con dos promociones vigentes a la vez sobre el paquete, gana la de mayor descuento (D-PROM-3) y el precio queda rebajado');

SELECT results_eq(
  $$SELECT package_price, promotion_id, discount_percent
      FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d5')$$,
  $$VALUES (10000::bigint, NULL::uuid, NULL::integer)$$,
  'una promoción vencida o pausada sobre el paquete no se aplica: precio base, sin promoción');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.catalog_package_booking_terms('00000000-0000-0000-0000-0000000006d1')$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'catalog_package_booking_terms' AND p.prosecdef),
  0, 'la función corre con los permisos de quien la llama, no los eleva');

SELECT * FROM finish();
ROLLBACK;
