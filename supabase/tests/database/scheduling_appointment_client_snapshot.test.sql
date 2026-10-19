-- US-AGE-05 · scheduling — la cita guarda de quién es y lo que se acordó al reservar (DOM-002).
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005a1', 'snapshot-admin@test.local'),
  ('00000000-0000-0000-0000-0000000005a2', 'snapshot-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000005a3', 'snapshot-clienta-b@test.local'),
  ('00000000-0000-0000-0000-0000000005a4', 'snapshot-sin-perfil@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005a2',
   'Clienta A', 'snapshot-clienta-a@test.local', '+50688880001'),
  ('00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-0000000005a3',
   'Clienta B', 'snapshot-clienta-b@test.local', '+50688880002');

INSERT INTO public.scheduling_appointments
  (id, resource_id, starts_at, ends_at, occupied_range,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-00000005d901', '00000000-0000-0000-0000-000000000a01',
   '2027-08-01 10:00+00', '2027-08-01 11:00+00', tstzrange('2027-08-01 09:45+00', '2027-08-01 11:15+00', '[)'),
   '00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005e1',
   'Clásicas', true, 35000, 10000),
  ('00000000-0000-0000-0000-00000005d902', '00000000-0000-0000-0000-000000000a01',
   '2027-08-02 10:00+00', '2027-08-02 11:00+00', tstzrange('2027-08-02 09:45+00', '2027-08-02 11:15+00', '[)'),
   '00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-0000000005e1',
   'Clásicas', false, 25000, 10000);

INSERT INTO public.scheduling_appointments (id, resource_id, starts_at, ends_at, occupied_range)
VALUES
  ('00000000-0000-0000-0000-00000005d903', '00000000-0000-0000-0000-000000000a01',
   '2027-08-03 10:00+00', '2027-08-03 11:00+00', tstzrange('2027-08-03 09:45+00', '2027-08-03 11:15+00', '[)'));

SELECT has_index('public', 'scheduling_appointments', 'idx_scheduling_appointments_client',
  'la clienta de cada cita está indexada (PERF-003)');

-- ── Anónimo ──────────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_appointments), 0,
  'anónimo: no ve ninguna cita');

-- ── Clienta A: solo lo suyo ──────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a2","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_appointments), 1,
  'clienta A: ve una sola cita, ni la de otra clienta ni las que no tienen clienta');

SELECT is((SELECT client_id FROM public.scheduling_appointments),
  '00000000-0000-0000-0000-0000000005c1'::uuid, 'clienta A: la cita que ve es la suya');

SELECT is((SELECT count(*)::int FROM public.scheduling_appointments
            WHERE client_id = '00000000-0000-0000-0000-0000000005c2'), 0,
  'clienta A: no ve la cita de la clienta B');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments
      (resource_id, starts_at, ends_at, occupied_range,
       client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-08-10 10:00+00', '2027-08-10 11:00+00',
            tstzrange('2027-08-10 09:45+00', '2027-08-10 11:15+00', '[)'),
            '00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005e1',
            'Clásicas', true, 1, 0)$$,
  '42501', NULL, 'clienta A: no inserta una cita directo en la tabla, ni a su nombre');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET service_price = 1
     WHERE id = '00000000-0000-0000-0000-00000005d901'$$,
  '42501', NULL, 'clienta A: no cambia el precio congelado de su cita');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments
       SET client_id = '00000000-0000-0000-0000-0000000005c2'
     WHERE id = '00000000-0000-0000-0000-00000005d901'$$,
  '42501', NULL, 'clienta A: no pasa su cita a otra clienta');

-- ── Clienta sin perfil ───────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a4","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_appointments), 0,
  'sin perfil de clienta: no ve ninguna cita');

-- ── Administradora ───────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a1","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_appointments), 3,
  'admin: sigue viendo todas las citas');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET service_price = 1
     WHERE id = '00000000-0000-0000-0000-00000005d901'$$,
  '42501', NULL, 'admin: tampoco cambia el precio congelado');

SELECT lives_ok(
  $$UPDATE public.scheduling_appointments SET status = 'approved'
     WHERE id = '00000000-0000-0000-0000-00000005d901'$$,
  'admin: aprobar una cita sigue funcionando');

-- ── Reglas de la tabla ───────────────────────────────────────────────────────
RESET ROLE;

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments
      (resource_id, starts_at, ends_at, occupied_range, client_id)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-08-11 10:00+00', '2027-08-11 11:00+00',
            tstzrange('2027-08-11 09:45+00', '2027-08-11 11:15+00', '[)'),
            '00000000-0000-0000-0000-0000000005c1')$$,
  '23514', NULL, 'una cita con clienta pero sin técnica ni montos no se guarda a medias');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments
      (id, resource_id, starts_at, ends_at, occupied_range,
       client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
    VALUES ('00000000-0000-0000-0000-00000005d904', '00000000-0000-0000-0000-000000000a01',
            '2027-08-12 10:00+00', '2027-08-12 11:00+00',
            tstzrange('2027-08-12 09:45+00', '2027-08-12 11:15+00', '[)'),
            '00000000-0000-0000-0000-0000000005c1', gen_random_uuid(),
            'Técnica que ya no existe', false, 20000, 5000)$$,
  'una cita completa se guarda, aunque la técnica no esté en ninguna tabla');

SELECT is(
  (SELECT deposit_registered FROM public.scheduling_appointments
    WHERE id = '00000000-0000-0000-0000-00000005d904'),
  0::bigint, 'el anticipo registrado nace en 0');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments
      (resource_id, starts_at, ends_at, occupied_range,
       client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-08-13 10:00+00', '2027-08-13 11:00+00',
            tstzrange('2027-08-13 09:45+00', '2027-08-13 11:15+00', '[)'),
            '00000000-0000-0000-0000-0000000005c1', gen_random_uuid(), 'Gratis', true, 0, 0)$$,
  '23514', NULL, 'el precio congelado es mayor que cero');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments
      (resource_id, starts_at, ends_at, occupied_range,
       client_id, technique_id, technique_name, is_first_time, service_price, deposit_required,
       deposit_registered)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-08-14 10:00+00', '2027-08-14 11:00+00',
            tstzrange('2027-08-14 09:45+00', '2027-08-14 11:15+00', '[)'),
            '00000000-0000-0000-0000-0000000005c1', gen_random_uuid(), 'Clásicas', true, 20000, 100, 150)$$,
  '23514', NULL, 'el anticipo registrado no pasa del requerido al crear la cita');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET deposit_registered = 999999
     WHERE id = '00000000-0000-0000-0000-00000005d904'$$,
  '23514', NULL, 'el anticipo registrado no pasa del requerido al actualizarlo');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-08-15 10:00+00', '2027-08-15 11:00+00',
            tstzrange('2027-08-15 09:45+00', '2027-08-15 11:15+00', '[)'))$$,
  'una cita sin clienta, como las que ya existían, sigue siendo válida');

SELECT throws_ok(
  $$DELETE FROM public.clients_profiles WHERE id = '00000000-0000-0000-0000-0000000005c1'$$,
  '23503', NULL, 'una clienta con citas no se borra (ADR-0009)');

SELECT * FROM finish();
ROLLBACK;
