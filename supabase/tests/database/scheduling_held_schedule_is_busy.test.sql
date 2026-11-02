-- US-AGE-10 · hallazgo A2: el horario que guarda un reagendado sigue ocupado para el calendario, la
-- reserva y el bloqueo manual.
-- Correr con: npx supabase test db
-- Lunes de prueba abiertos de 09:00 a 17:00: 2027-12-06 (horario guardado) y 2027-12-13 (horario
-- nuevo). Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000004e1', 'held-busy-a@test.local'),
  ('00000000-0000-0000-0000-0000000004e2', 'held-busy-b@test.local'),
  ('00000000-0000-0000-0000-0000000004e3', 'held-busy-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000004e3';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000004c1', '00000000-0000-0000-0000-0000000004e1',
   'Clienta A', 'held-busy-a@test.local', '+50688880101'),
  ('00000000-0000-0000-0000-0000000004c2', '00000000-0000-0000-0000-0000000004e2',
   'Clienta B', 'held-busy-b@test.local', '+50688880102');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES ('00000000-0000-0000-0000-0000000004f4', 'zz-test ocupado', 'lash_classic',
        35000, 25000, 60, 45, 15, 10000, 'cuidados', true);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered,
   previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
VALUES ('00000000-0000-0000-0000-000000004a01', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
        '2027-12-13 10:00-06', '2027-12-13 11:00-06', tstzrange('2027-12-13 10:00-06', '2027-12-13 11:15-06'),
        '00000000-0000-0000-0000-0000000004c1', '00000000-0000-0000-0000-0000000004f4', 'zz-test ocupado',
        true, 35000, 10000, 10000,
        '2027-12-06 10:00-06', '2027-12-06 11:00-06', tstzrange('2027-12-06 10:00-06', '2027-12-06 11:15-06'),
        'approved');

SET LOCAL ROLE authenticated;

-- ── Clienta B ───────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004e2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges('00000000-0000-0000-0000-000000000a01', '2027-12-06')$$,
  $$VALUES ('2027-12-06 10:00-06'::timestamptz, '2027-12-06 11:30-06'::timestamptz)$$,
  'calendario: el horario guardado se ve ocupado, redondeado a la grilla');

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges('00000000-0000-0000-0000-000000000a01', '2027-12-13')$$,
  $$VALUES ('2027-12-13 10:00-06'::timestamptz, '2027-12-13 11:30-06'::timestamptz)$$,
  'calendario: el horario nuevo también');

SELECT results_eq(
  $$SELECT starts_at, ends_at FROM public.scheduling_busy_ranges(
      '00000000-0000-0000-0000-000000000a01', '2027-12-06', '00000000-0000-0000-0000-000000004a01')$$,
  $$VALUES ('2027-12-06 10:00-06'::timestamptz, '2027-12-06 11:30-06'::timestamptz)$$,
  'calendario: otra clienta no puede pedir que se ignore la cita de A');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-12-06 10:00-06', '00000000-0000-0000-0000-0000000004f4', true)$$,
  'P0001', 'scheduling_slot_taken', 'reserva: B no puede reservar el horario guardado de A');

RESET ROLE;

SELECT is(
  (SELECT count(*) FROM public.scheduling_alerts WHERE requested_from = '2027-12-06 10:00-06'),
  0::bigint, 'reserva: no queda como un choque de concurrencia ni alerta a la administradora');

-- ── Clienta A, al reagendar otra vez ──────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004e1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.scheduling_busy_ranges(
     '00000000-0000-0000-0000-000000000a01', '2027-12-06', '00000000-0000-0000-0000-000000004a01')),
  0::bigint, 'calendario: A, ignorando su propia cita, ve libre su horario guardado');

-- ── Admin ───────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004e3","role":"authenticated"}', true);

SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-12-06 10:30-06', '2027-12-06 12:00-06')$$,
  '23514', 'scheduling_manual_blocks_active_appointment',
  'bloqueo manual: la administradora no puede bloquear el horario guardado');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-12-06 13:00-06', '2027-12-06 14:00-06')$$,
  'bloqueo manual: fuera de los dos espacios sí bloquea');

SELECT * FROM finish();
ROLLBACK;
