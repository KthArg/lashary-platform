-- US-AGE-05 · scheduling — la reserva de la clienta la calcula y valida la base.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2027-09-06 (abierto 09:00–12:00 y 12:00–17:00, dos bloques que se tocan),
-- 2027-09-13 (cerrado) y 2027-09-20 (con un bloqueo de 10:00 a 11:00). Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(26);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005e2', 'book-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000005e3', 'book-clienta-exonerada@test.local'),
  ('00000000-0000-0000-0000-0000000005e4', 'book-sin-perfil@test.local'),
  ('00000000-0000-0000-0000-0000000005e5', 'book-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005e5';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000005c6', '00000000-0000-0000-0000-0000000005e2',
   'Clienta A', 'book-clienta-a@test.local', '+50688880006'),
  ('00000000-0000-0000-0000-0000000005c7', '00000000-0000-0000-0000-0000000005e3',
   'Clienta exonerada', 'book-clienta-exonerada@test.local', '+50688880007');

INSERT INTO public.payments_deposit_exemptions (client_id, exempted_by, reason)
VALUES ('00000000-0000-0000-0000-0000000005c7', '00000000-0000-0000-0000-0000000005e5', 'Clienta frecuente');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000005f4', 'zz-test reservable', 'lash_classic',
   35000, 25000, 60, 45, 15, 10000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000005f5', 'zz-test sin retoque', 'henna',
   18000, NULL, 60, NULL, 0, 5000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000005f6', 'zz-test desactivada', 'lips',
   22000, NULL, 45, NULL, 0, 0, 'cuidados', false);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 1, 540, 720),
  ('00000000-0000-0000-0000-000000000a01', 1, 720, 1020);

INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
VALUES ('00000000-0000-0000-0000-000000000a01', '2027-09-13', 'non_working');

INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
VALUES ('00000000-0000-0000-0000-000000000a01', '2027-09-20 10:00-06', '2027-09-20 11:00-06');

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

-- ── Clienta A reserva ────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005e2","role":"authenticated"}', true);

CREATE TEMP TABLE booked AS
  SELECT * FROM public.scheduling_book_appointment(
    '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
    '00000000-0000-0000-0000-0000000005f4', true);

SELECT is((SELECT client_id FROM booked), '00000000-0000-0000-0000-0000000005c6'::uuid,
  'la clienta sale de la sesión, no de un parámetro');

SELECT is((SELECT status FROM booked), 'pending_approval', 'la reserva nace pendiente de aprobación');

SELECT results_eq(
  $$SELECT technique_name, service_price, deposit_required, deposit_registered, is_first_time FROM booked$$,
  $$VALUES ('zz-test reservable'::text, 35000::bigint, 10000::bigint, 0::bigint, true)$$,
  'guarda el nombre, el precio y el anticipo del catálogo, y el registrado en 0');

SELECT is((SELECT ends_at FROM booked), '2027-09-06 10:00-06'::timestamptz,
  'el fin del servicio es el inicio más la duración');

SELECT is((SELECT upper(occupied_range) FROM booked), '2027-09-06 10:15-06'::timestamptz,
  'el rango ocupado suma la limpieza');

SELECT is(
  (SELECT service_price FROM public.scheduling_book_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 10:30-06',
     '00000000-0000-0000-0000-0000000005f4', false)),
  25000::bigint, 'un retoque se cobra al precio del retoque');

SELECT lives_ok(
  $$SELECT public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06 11:30-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'una reserva puede cruzar el punto donde dos bloques abiertos se tocan');

-- ── Lo que el calendario no ofrece ───────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 09:10-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_not_offered', 'un inicio fuera de la grilla de 30 minutos no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 08:30-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_not_offered', 'antes de abrir no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 16:30-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_not_offered', 'si el servicio y la limpieza no caben antes de cerrar, no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-13 09:00-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_not_offered', 'un día cerrado no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2020-01-06 09:00-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_not_offered', 'una fecha pasada no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-0000000000ff', '2027-09-06 13:00-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_not_offered', 'un recurso que no existe no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', NULL,
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_not_offered', 'sin hora no se ofrece');

-- ── Lo que ya está ocupado ───────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_taken', 'el mismo espacio dos veces: el segundo recibe «ocupado»');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 10:00-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_taken', 'un espacio que se cruza con la limpieza de otra cita está ocupado');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-20 10:30-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_taken', 'un bloqueo de la administradora ocupa el espacio');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-20 09:00-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_slot_taken', 'la limpieza también cuenta contra un bloqueo');

-- ── Técnica ──────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 14:00-06',
      '00000000-0000-0000-0000-0000000005f6', true)$$,
  'P0001', 'scheduling_technique_not_available', 'una técnica desactivada no se reserva');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 14:00-06',
      '00000000-0000-0000-0000-0000000005f5', false)$$,
  'P0001', 'scheduling_technique_not_available', 'no se reserva retoque de una técnica que no lo ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 14:00-06',
      '00000000-0000-0000-0000-000000000bad', true)$$,
  'P0001', 'scheduling_technique_not_available', 'una técnica que no existe no se reserva');

-- ── Quién reserva ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005e3","role":"authenticated"}', true);

SELECT is(
  (SELECT deposit_required FROM public.scheduling_book_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 13:00-06',
     '00000000-0000-0000-0000-0000000005f4', true)),
  0::bigint, 'una clienta exonerada reserva sin anticipo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005e4","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 15:00-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  'P0001', 'scheduling_client_not_registered', 'una usuaria sin perfil de clienta no reserva');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 15:00-06',
      '00000000-0000-0000-0000-0000000005f4', true)$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments
    WHERE client_id IN ('00000000-0000-0000-0000-0000000005c6', '00000000-0000-0000-0000-0000000005c7')),
  4, 'los intentos rechazados no dejaron ninguna cita');

SELECT is(
  (SELECT pronargs::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'scheduling_book_appointment'),
  4, 'la función no recibe ni la clienta ni los montos');

SELECT * FROM finish();
ROLLBACK;
