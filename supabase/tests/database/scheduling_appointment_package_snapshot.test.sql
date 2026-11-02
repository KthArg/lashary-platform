-- US-AGE-04 · scheduling — la cita sabe congelar un paquete, no solo una técnica (DOM-002).
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000007a1', 'package-snapshot-admin@test.local'),
  ('00000000-0000-0000-0000-0000000007a2', 'package-snapshot-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000007a3', 'package-snapshot-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000007a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-0000000007a2',
   'Clienta paquete A', 'package-snapshot-clienta-a@test.local', '+50688880011'),
  ('00000000-0000-0000-0000-0000000007c2', '00000000-0000-0000-0000-0000000007a3',
   'Clienta paquete B', 'package-snapshot-clienta-b@test.local', '+50688880012');

SELECT has_index('public', 'scheduling_appointments', 'idx_scheduling_appointments_package',
  'el paquete de cada cita está indexado (PERF-003)');

-- ── El CHECK admite las tres formas (como postgres, para aislar el constraint de RLS) ──────────
RESET ROLE;

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments
      (id, resource_id, starts_at, ends_at, occupied_range,
       client_id, package_id, package_name, service_price, deposit_required)
    VALUES ('00000000-0000-0000-0000-00000007d901', '00000000-0000-0000-0000-000000000a01',
            '2027-09-01 10:00+00', '2027-09-01 12:00+00',
            tstzrange('2027-09-01 10:00+00', '2027-09-01 12:00+00', '[)'),
            '00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-00000007f001',
            'zz-paquete completo', 30000, 8000)$$,
  'una cita de paquete completa se guarda');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointment_package_techniques
      (appointment_id, technique_id, technique_name, duration_min, buffer_min)
    VALUES
      ('00000000-0000-0000-0000-00000007d901', '00000000-0000-0000-0000-00000007f101',
       'zz-paquete técnica 1', 90, 15),
      ('00000000-0000-0000-0000-00000007d901', '00000000-0000-0000-0000-00000007f102',
       'zz-paquete técnica 2', 45, 10)$$,
  'las dos técnicas congeladas del paquete se guardan');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments
      (resource_id, starts_at, ends_at, occupied_range,
       client_id, package_id, package_name, technique_id, service_price, deposit_required)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-09-02 10:00+00', '2027-09-02 12:00+00',
            tstzrange('2027-09-02 10:00+00', '2027-09-02 12:00+00', '[)'),
            '00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-00000007f002',
            'zz-paquete mixto', gen_random_uuid(), 30000, 8000)$$,
  '23514', NULL, 'una cita no puede ser paquete y técnica suelta a la vez');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments
      (resource_id, starts_at, ends_at, occupied_range, client_id, package_id, service_price, deposit_required)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-09-03 10:00+00', '2027-09-03 12:00+00',
            tstzrange('2027-09-03 10:00+00', '2027-09-03 12:00+00', '[)'),
            '00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-00000007f003', 30000, 8000)$$,
  '23514', NULL, 'un paquete sin su nombre congelado no se guarda a medias');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments
      (id, resource_id, starts_at, ends_at, occupied_range,
       client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
    VALUES ('00000000-0000-0000-0000-00000007d902', '00000000-0000-0000-0000-000000000a01',
            '2027-09-04 10:00+00', '2027-09-04 11:00+00',
            tstzrange('2027-09-04 09:45+00', '2027-09-04 11:15+00', '[)'),
            '00000000-0000-0000-0000-0000000007c2', gen_random_uuid(), 'zz-técnica suelta', true,
            20000, 5000)$$,
  'la forma de una sola técnica (US-AGE-05) sigue funcionando sin tocar el paquete');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-09-05 10:00+00', '2027-09-05 11:00+00',
            tstzrange('2027-09-05 09:45+00', '2027-09-05 11:15+00', '[)'))$$,
  'la forma vacía (sin reserva) sigue siendo válida');

-- ── RLS de scheduling_appointment_package_techniques ────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_appointment_package_techniques), 0,
  'anónimo: no ve ninguna técnica de paquete');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointment_package_techniques
      (appointment_id, technique_id, technique_name, duration_min, buffer_min)
    VALUES ('00000000-0000-0000-0000-00000007d901', gen_random_uuid(), 'intrusa', 10, 0)$$,
  '42501', NULL, 'anónimo: no inserta directo en la tabla de técnicas del paquete');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a2","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_appointment_package_techniques), 2,
  'clienta A: ve las dos técnicas de su propio paquete');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointment_package_techniques
      (appointment_id, technique_id, technique_name, duration_min, buffer_min)
    VALUES ('00000000-0000-0000-0000-00000007d901', gen_random_uuid(), 'intrusa', 10, 0)$$,
  '42501', NULL, 'clienta A: no inserta una técnica más en su propio paquete');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a3","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_appointment_package_techniques), 0,
  'clienta B: no ve las técnicas del paquete de la clienta A');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_appointment_package_techniques), 2,
  'admin: ve las técnicas de cualquier paquete');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
