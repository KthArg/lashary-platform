-- US-AGE-04 · scheduling — la cotización de un paquete antes de confirmar sale de lo mismo que se
-- guarda, igual que scheduling_quote_booking para una técnica suelta.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000009a6', 'pkg-quote-clienta@test.local'),
  ('00000000-0000-0000-0000-0000000009a7', 'pkg-quote-exonerada@test.local'),
  ('00000000-0000-0000-0000-0000000009a8', 'pkg-quote-sin-perfil@test.local'),
  ('00000000-0000-0000-0000-0000000009a9', 'pkg-quote-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000009a9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000009c8', '00000000-0000-0000-0000-0000000009a6',
   'Clienta cotiza paquete', 'pkg-quote-clienta@test.local', '+50688880018'),
  ('00000000-0000-0000-0000-0000000009c9', '00000000-0000-0000-0000-0000000009a7',
   'Exonerada cotiza paquete', 'pkg-quote-exonerada@test.local', '+50688880019');

INSERT INTO public.payments_deposit_exemptions (client_id, exempted_by, reason)
VALUES ('00000000-0000-0000-0000-0000000009c9', '00000000-0000-0000-0000-0000000009a9', 'Clienta frecuente');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000009f1', 'zz-paquete cotizable técnica 1', 'lash_classic',
   20000, 60, 15, 4000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000009f2', 'zz-paquete cotizable técnica 2', 'brow_design',
   10000, 30, 5, 2000, 'cuidados', true);

INSERT INTO public.catalog_packages (id, name, price, deposit, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000009d1', 'zz-paquete cotizable', 45000, 12000, true),
  ('00000000-0000-0000-0000-0000000009d2', 'zz-paquete cotizable desactivado', 45000, 12000, false);

INSERT INTO public.catalog_package_techniques (package_id, technique_id) VALUES
  ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009f1'),
  ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009f2');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a6","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT package_name, price, duration_min, buffer_min, deposit_due
      FROM public.scheduling_quote_package_booking('00000000-0000-0000-0000-0000000009d1')$$,
  $$VALUES ('zz-paquete cotizable'::text, 45000::bigint, 90, 20, 12000::bigint)$$,
  'nombre, precio del paquete, tiempo total (60+30, 15+5) y anticipo');

SELECT results_eq(
  $$SELECT q.price, q.deposit_due
      FROM public.scheduling_quote_package_booking('00000000-0000-0000-0000-0000000009d1') q$$,
  $$SELECT b.service_price, b.deposit_required
      FROM public.scheduling_book_package_appointment(
        '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
        '00000000-0000-0000-0000-0000000009d1') b$$,
  'lo que se cotiza es lo que la reserva real guarda (criterio 3)');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_package_booking('00000000-0000-0000-0000-0000000009d2')$$,
  'P0001', 'scheduling_package_not_available', 'un paquete desactivado no se cotiza');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_package_booking('00000000-0000-0000-0000-00000000bad0')$$,
  'P0001', 'scheduling_package_not_available', 'un paquete que no existe no se cotiza');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a7","role":"authenticated"}', true);

SELECT is(
  (SELECT deposit_due FROM public.scheduling_quote_package_booking('00000000-0000-0000-0000-0000000009d1')),
  0::bigint, 'una clienta exonerada ve el anticipo del paquete en cero');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a8","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_package_booking('00000000-0000-0000-0000-0000000009d1')$$,
  'P0001', 'scheduling_client_not_registered', 'una usuaria sin perfil de clienta no cotiza');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_package_booking('00000000-0000-0000-0000-0000000009d1')$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments
    WHERE client_id IN ('00000000-0000-0000-0000-0000000009c8', '00000000-0000-0000-0000-0000000009c9')),
  1, 'cotizar no reserva nada: solo existe la cita de la prueba de paridad');

SELECT is(
  (SELECT pronargs::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'scheduling_quote_package_booking'),
  1, 'la función no recibe ni la clienta ni los montos, solo el paquete');

SELECT * FROM finish();
ROLLBACK;
