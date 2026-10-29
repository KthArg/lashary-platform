-- US-AGE-05 · catalog — contrato SQL que usa la reserva: condiciones de una técnica.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000005b1', 'booking-terms-clienta@test.local');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000005f1', 'zz-test con retoque', 'lash_classic',
   35000, 25000, 120, 75, 15, 10000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000005f2', 'zz-test sin retoque', 'henna',
   18000, NULL, 60, NULL, 10, 5000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000005f3', 'zz-test desactivada', 'lips',
   22000, NULL, 45, NULL, 0, 0, 'cuidados', false),
  ('00000000-0000-0000-0000-0000000005f4', 'zz-test con promo vigente', 'lash_classic',
   10000, NULL, 60, NULL, 0, 0, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000005f5', 'zz-test con promo vencida y pausada', 'lash_classic',
   10000, NULL, 60, NULL, 0, 0, 'cuidados', true);

-- US-PROM-01: dos promociones vigentes a la vez sobre la misma técnica (el esquema no lo
-- impide) — gana la de mayor descuento (D-PROM-3). Las otras dos (vencida y pausada) prueban
-- que catalog_booking_terms nunca las aplica.
INSERT INTO public.catalog_promotions (id, technique_id, discount_percent, starts_at, ends_at, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000006f1', '00000000-0000-0000-0000-0000000005f4', 20,
    now() - interval '1 day', now() + interval '1 day', true),
  ('00000000-0000-0000-0000-0000000006f2', '00000000-0000-0000-0000-0000000005f4', 10,
    now() - interval '1 day', now() + interval '1 day', true),
  ('00000000-0000-0000-0000-0000000006f3', '00000000-0000-0000-0000-0000000005f5', 50,
    now() - interval '10 day', now() - interval '1 day', true),
  ('00000000-0000-0000-0000-0000000006f4', '00000000-0000-0000-0000-0000000005f5', 50,
    now() - interval '1 day', now() + interval '1 day', false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005b1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT name, price, duration_min, buffer_min, deposit
      FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f1', true)$$,
  $$VALUES ('zz-test con retoque'::text, 35000::bigint, 120, 15, 10000::bigint)$$,
  'primera vez: precio, duración, limpieza y anticipo de la primera vez');

SELECT results_eq(
  $$SELECT price, duration_min, deposit
      FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f1', false)$$,
  $$VALUES (25000::bigint, 75, 10000::bigint)$$,
  'retoque: precio y duración del retoque, con el mismo anticipo');

SELECT is(
  (SELECT technique_id FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f1', true)),
  '00000000-0000-0000-0000-0000000005f1'::uuid, 'devuelve el id de la técnica');

SELECT is_empty(
  $$SELECT * FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f2', false)$$,
  'una técnica sin retoque no se ofrece como retoque');

SELECT isnt_empty(
  $$SELECT * FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f2', true)$$,
  'una técnica sin retoque sí se ofrece de primera vez');

SELECT is_empty(
  $$SELECT * FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f3', true)$$,
  'una técnica desactivada no se ofrece');

SELECT is_empty(
  $$SELECT * FROM public.catalog_booking_terms('00000000-0000-0000-0000-000000000bad', true)$$,
  'una técnica que no existe no devuelve nada');

SELECT is_empty(
  $$SELECT * FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f1', NULL)$$,
  'sin saber si es primera vez no devuelve nada');

SELECT results_eq(
  $$SELECT price, promotion_id, discount_percent
      FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f4', true)$$,
  $$VALUES (8000::bigint, '00000000-0000-0000-0000-0000000006f1'::uuid, 20)$$,
  'con dos promociones vigentes a la vez, gana la de mayor descuento (D-PROM-3) y el precio queda rebajado');

SELECT results_eq(
  $$SELECT price, promotion_id, discount_percent
      FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f5', true)$$,
  $$VALUES (10000::bigint, NULL::uuid, NULL::integer)$$,
  'una promoción vencida o pausada no se aplica: precio base, sin promoción');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.catalog_booking_terms('00000000-0000-0000-0000-0000000005f1', true)$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'catalog_booking_terms' AND p.prosecdef),
  0, 'la función corre con los permisos de quien la llama, no los eleva');

SELECT * FROM finish();
ROLLBACK;
