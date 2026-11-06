-- US-AGE-05 · scheduling — la cotización del anticipo antes de confirmar sale de lo mismo que se guarda.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005a6', 'quote-clienta@test.local'),
  ('00000000-0000-0000-0000-0000000005a7', 'quote-exonerada@test.local'),
  ('00000000-0000-0000-0000-0000000005a8', 'quote-sin-perfil@test.local'),
  ('00000000-0000-0000-0000-0000000005a9', 'quote-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005a9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000005c8', '00000000-0000-0000-0000-0000000005a6',
   'Clienta', 'quote-clienta@test.local', '+50688880008'),
  ('00000000-0000-0000-0000-0000000005c9', '00000000-0000-0000-0000-0000000005a7',
   'Exonerada', 'quote-exonerada@test.local', '+50688880009');

INSERT INTO public.payments_deposit_exemptions (client_id, exempted_by, reason)
VALUES ('00000000-0000-0000-0000-0000000005c9', '00000000-0000-0000-0000-0000000005a9', 'Clienta frecuente');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000005f7', 'zz-test cotizable', 'lash_classic',
   35000, 25000, 60, 45, 15, 10000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000005f8', 'zz-test sin retoque', 'henna',
   18000, NULL, 60, NULL, 0, 5000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000005f9', 'zz-test desactivada', 'lips',
   22000, NULL, 45, NULL, 0, 0, 'cuidados', false),
  ('00000000-0000-0000-0000-0000000005fa', 'zz-test con promo', 'lash_classic',
   20000, NULL, 30, NULL, 0, 0, 'cuidados', true);

-- US-PROM-01: promoción vigente sobre esta técnica, para probar que la paridad entre cotizar
-- y reservar también cubre promotion_id/discount_percent.
INSERT INTO public.catalog_promotions (id, technique_id, discount_percent, starts_at, ends_at, is_active)
VALUES ('00000000-0000-0000-0000-0000000006fa', '00000000-0000-0000-0000-0000000005fa', 25,
  now() - interval '1 day', now() + interval '1 day', true);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a6","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT technique_name, price, duration_min, buffer_min, deposit_due
      FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005f7', true)$$,
  $$VALUES ('zz-test cotizable'::text, 35000::bigint, 60, 15, 10000::bigint)$$,
  'primera vez: nombre, precio, duración, limpieza y anticipo');

SELECT results_eq(
  $$SELECT price, duration_min, deposit_due
      FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005f7', false)$$,
  $$VALUES (25000::bigint, 45, 10000::bigint)$$,
  'retoque: precio y duración del retoque');

SELECT results_eq(
  $$SELECT q.price, q.deposit_due
      FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005f7', true) q$$,
  $$SELECT b.service_price, b.deposit_required
      FROM public.scheduling_book_appointment(
        '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
        '00000000-0000-0000-0000-0000000005f7', true) b$$,
  'lo que se cotiza es lo que la reserva guarda');

SELECT results_eq(
  $$SELECT q.price, q.promotion_id, q.discount_percent
      FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005fa', true) q$$,
  $$SELECT b.service_price, b.promotion_id, b.discount_percent
      FROM public.scheduling_book_appointment(
        '00000000-0000-0000-0000-000000000a01', '2027-09-06 11:00-06',
        '00000000-0000-0000-0000-0000000005fa', true) b$$,
  'con promoción vigente, lo que se cotiza ya rebajado es lo que la reserva guarda (US-PROM-01)');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005f9', true)$$,
  'P0001', 'scheduling_technique_not_available', 'una técnica desactivada no se cotiza');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005f8', false)$$,
  'P0001', 'scheduling_technique_not_available', 'no se cotiza retoque de una técnica que no lo ofrece');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_booking('00000000-0000-0000-0000-000000000bad', true)$$,
  'P0001', 'scheduling_technique_not_available', 'una técnica que no existe no se cotiza');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a7","role":"authenticated"}', true);

SELECT is(
  (SELECT deposit_due FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005f7', true)),
  0::bigint, 'una clienta exonerada ve el anticipo en cero');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a8","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005f7', true)$$,
  'P0001', 'scheduling_client_not_registered', 'una usuaria sin perfil de clienta no cotiza');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_booking('00000000-0000-0000-0000-0000000005f7', true)$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments
    WHERE client_id IN ('00000000-0000-0000-0000-0000000005c8', '00000000-0000-0000-0000-0000000005c9')),
  2, 'cotizar no reserva nada: solo existen las dos citas de las pruebas de paridad');

SELECT is(
  (SELECT pronargs::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'scheduling_quote_booking'),
  2, 'la función no recibe ni la clienta ni los montos');

SELECT * FROM finish();
ROLLBACK;
