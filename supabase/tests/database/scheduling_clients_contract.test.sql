-- US-AGE-05 · scheduling usa el contrato de clients y no lee clients_profiles (ARCH-005).
-- Correr con: npx supabase test db
-- La llave foránea client_id → clients_profiles(id) es la excepción registrada en el ADR-0009: no
-- cuenta como lectura y no se revisa aquí. Lo que se revisa son las funciones y las políticas.

BEGIN;
SELECT plan(6);

SELECT is(
  (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'scheduling\_%'
      AND p.prosrc ILIKE '%clients_profiles%'),
  0::bigint,
  'ninguna función de scheduling consulta clients_profiles');

SELECT is(
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename LIKE 'scheduling\_%'
      AND (qual ILIKE '%clients_profiles%' OR with_check ILIKE '%clients_profiles%')),
  0::bigint,
  'ninguna política de scheduling consulta clients_profiles');

SELECT is(
  (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN
      ('scheduling_book_appointment', 'scheduling_quote_booking', 'scheduling_has_completed_appointment')
      AND p.prosrc LIKE '%clients_current_profile_id%'),
  3::bigint,
  'la reserva, la cotización y el historial identifican a la clienta por el contrato de clients');

SELECT matches(
  (SELECT qual FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scheduling_appointments'
      AND policyname = 'scheduling_appointments_select_own'),
  'clients_current_profile_id',
  'la política de lectura propia usa el contrato de clients');

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000010e2', 'sched-contract-a@test.local'),
  ('00000000-0000-0000-0000-0000000010e3', 'sched-contract-b@test.local');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010e2',
   'Clienta A', 'sched-contract-a@test.local', '+50688880056'),
  ('00000000-0000-0000-0000-0000000010c7', '00000000-0000-0000-0000-0000000010e3',
   'Clienta B', 'sched-contract-b@test.local', '+50688880057');

INSERT INTO public.scheduling_appointments
  (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 'completed', '2026-01-05 09:00-06', '2026-01-05 10:00-06',
   tstzrange('2026-01-05 09:00-06', '2026-01-05 10:00-06'), '00000000-0000-0000-0000-0000000010c6',
   '00000000-0000-0000-0000-0000000010f4', 'zz-test', true, 35000, 0),
  ('00000000-0000-0000-0000-000000000a01', 'completed', '2026-01-06 09:00-06', '2026-01-06 10:00-06',
   tstzrange('2026-01-06 09:00-06', '2026-01-06 10:00-06'), '00000000-0000-0000-0000-0000000010c7',
   '00000000-0000-0000-0000-0000000010f5', 'zz-test', true, 35000, 0);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000010e2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id FROM public.scheduling_appointments$$,
  $$VALUES ('00000000-0000-0000-0000-0000000010c6'::uuid)$$,
  'la clienta sigue leyendo solo sus citas, sin ver las de otra');

SELECT results_eq(
  $$SELECT public.scheduling_has_completed_appointment('00000000-0000-0000-0000-0000000010f4'),
           public.scheduling_has_completed_appointment('00000000-0000-0000-0000-0000000010f5')$$,
  $$VALUES (true, false)$$,
  'el historial sigue siendo el de la clienta de la sesión y por técnica');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
