-- US-AGE-05 · la reserva guarda lo que el sistema detectó además de lo que eligió la clienta.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2027-09-06, abierto 09:00–17:00. Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000007e2', 'detected-a@test.local'),
  ('00000000-0000-0000-0000-0000000007e3', 'detected-b@test.local');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000007c6', '00000000-0000-0000-0000-0000000007e2',
   'Clienta A', 'detected-a@test.local', '+50688880026'),
  ('00000000-0000-0000-0000-0000000007c7', '00000000-0000-0000-0000-0000000007e3',
   'Clienta B', 'detected-b@test.local', '+50688880027');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000007f4', 'zz-test con historial', 'lash_classic',
   35000, 25000, 60, 45, 15, 10000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000007f5', 'zz-test otra técnica', 'henna',
   18000, 12000, 60, 45, 0, 5000, 'cuidados', true);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

INSERT INTO public.scheduling_appointments
  (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required)
SELECT '00000000-0000-0000-0000-000000000a01', v.status, v.starts_at, v.starts_at + interval '1 hour',
       tstzrange(v.starts_at, v.starts_at + interval '1 hour'), v.client_id, v.technique_id,
       'zz-test', true, 35000, 0
  FROM (VALUES
    ('approved',  '2026-01-05 09:00-06'::timestamptz, '00000000-0000-0000-0000-0000000007c6'::uuid, '00000000-0000-0000-0000-0000000007f5'::uuid),
    ('cancelled', '2026-01-06 09:00-06'::timestamptz, '00000000-0000-0000-0000-0000000007c6'::uuid, '00000000-0000-0000-0000-0000000007f5'::uuid),
    ('no_show',   '2026-01-07 09:00-06'::timestamptz, '00000000-0000-0000-0000-0000000007c6'::uuid, '00000000-0000-0000-0000-0000000007f5'::uuid),
    ('rejected',  '2026-01-08 09:00-06'::timestamptz, '00000000-0000-0000-0000-0000000007c6'::uuid, '00000000-0000-0000-0000-0000000007f5'::uuid),
    ('completed', '2026-01-09 09:00-06'::timestamptz, '00000000-0000-0000-0000-0000000007c7'::uuid, '00000000-0000-0000-0000-0000000007f5'::uuid)
  ) AS v(status, starts_at, client_id, technique_id);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007e2","role":"authenticated"}', true);

CREATE TEMP TABLE booked_no_history AS
  SELECT * FROM public.scheduling_book_appointment(
    '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
    '00000000-0000-0000-0000-0000000007f4', false);
GRANT SELECT ON booked_no_history TO PUBLIC;

SELECT results_eq(
  $$SELECT is_first_time, is_first_time_detected FROM booked_no_history$$,
  $$VALUES (false, true)$$,
  'sin historial, quien elige retoque queda con lo elegido (retoque) y lo detectado (primera vez)');

SELECT results_eq(
  $$SELECT is_first_time_detected FROM public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06 10:30-06',
      '00000000-0000-0000-0000-0000000007f5', true)$$,
  $$VALUES (true)$$,
  'citas aprobadas, canceladas, con ausencia o rechazadas no cuentan como historial');

SELECT results_eq(
  $$SELECT is_first_time_detected FROM public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06 12:00-06',
      '00000000-0000-0000-0000-0000000007f4', true)$$,
  $$VALUES (true)$$,
  'una cita pendiente propia (la reserva anterior) no cuenta como historial');

RESET ROLE;

INSERT INTO public.scheduling_appointments
  (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 'completed', '2026-02-02 09:00-06', '2026-02-02 10:00-06',
   tstzrange('2026-02-02 09:00-06', '2026-02-02 10:00-06'), '00000000-0000-0000-0000-0000000007c6',
   '00000000-0000-0000-0000-0000000007f4', 'zz-test', true, 35000, 0);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007e2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT is_first_time, is_first_time_detected FROM public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06 13:30-06',
      '00000000-0000-0000-0000-0000000007f4', true)$$,
  $$VALUES (true, false)$$,
  'con una cita completada con esa técnica se detecta re-aplicación, aunque haya elegido primera vez');

SELECT results_eq(
  $$SELECT is_first_time_detected FROM public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06 15:00-06',
      '00000000-0000-0000-0000-0000000007f5', false)$$,
  $$VALUES (true)$$,
  'el historial es por técnica: haber completado otra no cambia lo detectado');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007e3","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT is_first_time_detected FROM public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06 16:00-06',
      '00000000-0000-0000-0000-0000000007f4', false)$$,
  $$VALUES (true)$$,
  'el historial de otra clienta no cuenta: la clienta B no tiene ninguna cita completada con esa técnica');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET is_first_time_detected = true$$,
  '42501', NULL,
  'una clienta no puede escribir lo detectado');

RESET ROLE;

SELECT is(
  (SELECT count(*) FROM public.scheduling_appointments
    WHERE client_id IS NOT NULL AND status = 'pending_approval' AND is_first_time_detected IS NULL),
  0::bigint, 'toda cita reservada por la función queda con lo detectado');

SELECT * FROM finish();
ROLLBACK;
