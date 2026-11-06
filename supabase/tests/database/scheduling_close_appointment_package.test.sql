-- US-AGE-12 · el cierre de la cita entiende las citas de paquete (US-AGE-04).
-- Cobertura: completar un paquete cobra el precio congelado y nombra el paquete como servicio prestado
-- y en la bitácora; pedir otro servicio prestado sobre un paquete se rechaza sin cerrar ni cobrar; la
-- ausencia de un paquete no genera cargo. Todo se deshace con ROLLBACK.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000c20', 'close-package-admin@test.local'),
  ('00000000-0000-0000-0000-000000000c21', 'close-package-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000c20';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-000000000cd1', '00000000-0000-0000-0000-000000000c21',
        'Clienta del paquete', 'close-package-clienta@test.local', '+50688880062');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000005f1', 'zz-test cierre paquete otra', 'lash_classic',
   20000, 15000, 60, 45, 15, 5000, 'cuidados', true);

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, package_id, package_name,
   service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-00000000d1a1', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '402 days 10 hours', now() - interval '402 days 9 hours',
   tstzrange(now() - interval '402 days 10 hours', now() - interval '402 days 9 hours'),
   '00000000-0000-0000-0000-000000000cd1', '00000000-0000-0000-0000-0000000009a1', 'zz-test paquete novia',
   50000, 15000, 15000),
  ('00000000-0000-0000-0000-00000000d1a2', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '402 days 8 hours', now() - interval '402 days 7 hours',
   tstzrange(now() - interval '402 days 8 hours', now() - interval '402 days 7 hours'),
   '00000000-0000-0000-0000-000000000cd1', '00000000-0000-0000-0000-0000000009a1', 'zz-test paquete novia',
   50000, 15000, 15000),
  ('00000000-0000-0000-0000-00000000d1a3', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '402 days 6 hours', now() - interval '402 days 5 hours',
   tstzrange(now() - interval '402 days 6 hours', now() - interval '402 days 5 hours'),
   '00000000-0000-0000-0000-000000000cd1', '00000000-0000-0000-0000-0000000009a1', 'zz-test paquete novia',
   50000, 15000, 15000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c20","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT outcome, charge_amount, deposit_credit, amount_due
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000d1a1', 'completed')$$,
  $$VALUES ('completed', 50000::bigint, 15000::bigint, 35000::bigint)$$,
  'completar un paquete cobra el precio congelado y descuenta el anticipo');

SELECT results_eq(
  $$SELECT status, delivered_technique_id, delivered_technique_name
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000d1a1'$$,
  $$VALUES ('completed', NULL::uuid, 'zz-test paquete novia')$$,
  'el servicio prestado de un paquete es el nombre del paquete, sin técnica suelta');

RESET ROLE;

SELECT is(
  (SELECT payload ->> 'reservedTechniqueName' FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-00000000d1a1'),
  'zz-test paquete novia', 'el evento de la bitácora nombra el paquete reservado');

SELECT is(
  (SELECT payload ->> 'deliveredTechniqueName' FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-00000000d1a1'),
  'zz-test paquete novia', 'el evento de la bitácora nombra el paquete prestado');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c20","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment(
      '00000000-0000-0000-0000-00000000d1a2', 'completed', '00000000-0000-0000-0000-0000000005f1')$$,
  'P0001', 'scheduling_technique_not_available',
  'un paquete no admite otro servicio prestado');

RESET ROLE;

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000d1a2'),
  'approved', 'el rechazo deja el paquete sin cerrar');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000d1a2'),
  0, 'el rechazo no escribe asientos en el ledger');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c20","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT outcome, charge_amount, forfeited_deposit
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000d1a3', 'no_show')$$,
  $$VALUES ('no_show', 0::bigint, 15000::bigint)$$,
  'la ausencia de un paquete no cobra y pierde el anticipo registrado');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
