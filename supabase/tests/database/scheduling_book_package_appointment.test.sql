-- US-AGE-04 · scheduling — la reserva de un paquete la calcula y valida la base, igual que la
-- reserva de una técnica suelta (US-AGE-05).
-- Correr con: npx supabase test db
-- Lunes de prueba: 2027-09-06 (abierto 09:00–12:00 y 12:00–17:00), 2027-09-13 (cerrado) y
-- 2027-09-20 (con un bloqueo de 10:00 a 11:00). Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(21);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000008e2', 'pkg-book-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000008e3', 'pkg-book-clienta-exonerada@test.local'),
  ('00000000-0000-0000-0000-0000000008e4', 'pkg-book-sin-perfil@test.local'),
  ('00000000-0000-0000-0000-0000000008e5', 'pkg-book-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000008e5';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000008c6', '00000000-0000-0000-0000-0000000008e2',
   'Clienta paquete A', 'pkg-book-clienta-a@test.local', '+50688880016'),
  ('00000000-0000-0000-0000-0000000008c7', '00000000-0000-0000-0000-0000000008e3',
   'Clienta paquete exonerada', 'pkg-book-clienta-exonerada@test.local', '+50688880017');

INSERT INTO public.payments_deposit_exemptions (client_id, exempted_by, reason)
VALUES ('00000000-0000-0000-0000-0000000008c7', '00000000-0000-0000-0000-0000000008e5', 'Clienta frecuente');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000008f1', 'zz-paquete reservable técnica 1', 'lash_classic',
   20000, 60, 15, 4000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000008f2', 'zz-paquete reservable técnica 2', 'brow_design',
   10000, 30, 5, 2000, 'cuidados', true);

INSERT INTO public.catalog_packages (id, name, price, deposit, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000008d1', 'zz-paquete reservable', 45000, 12000, true),
  ('00000000-0000-0000-0000-0000000008d2', 'zz-paquete desactivado', 45000, 12000, false);

INSERT INTO public.catalog_package_techniques (package_id, technique_id) VALUES
  ('00000000-0000-0000-0000-0000000008d1', '00000000-0000-0000-0000-0000000008f1'),
  ('00000000-0000-0000-0000-0000000008d1', '00000000-0000-0000-0000-0000000008f2'),
  ('00000000-0000-0000-0000-0000000008d2', '00000000-0000-0000-0000-0000000008f1');

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

-- ── Clienta A reserva el paquete (90 min de servicio: 60+30; 20 min de limpieza: 15+5) ────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e2","role":"authenticated"}', true);

CREATE TEMP TABLE booked AS
  SELECT * FROM public.scheduling_book_package_appointment(
    '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
    '00000000-0000-0000-0000-0000000008d1');

SELECT is((SELECT client_id FROM booked), '00000000-0000-0000-0000-0000000008c6'::uuid,
  'la clienta sale de la sesión, no de un parámetro');

SELECT is((SELECT status FROM booked), 'pending_approval', 'la reserva nace pendiente de aprobación');

SELECT results_eq(
  $$SELECT package_name, service_price, deposit_required, deposit_registered,
           technique_id, technique_name, is_first_time
      FROM booked$$,
  $$VALUES ('zz-paquete reservable'::text, 45000::bigint, 12000::bigint, 0::bigint,
            NULL::uuid, NULL::text, NULL::boolean)$$,
  'guarda el nombre y el precio del paquete, sin técnica suelta ni primera vez (forma de paquete)');

SELECT is((SELECT ends_at FROM booked), '2027-09-06 10:30-06'::timestamptz,
  'criterio 2: el fin del servicio suma la duración de las dos técnicas (60 + 30)');

SELECT is((SELECT upper(occupied_range) FROM booked), '2027-09-06 10:50-06'::timestamptz,
  'criterio 2: el rango ocupado suma la limpieza de las dos técnicas (15 + 5), al final del bloque');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointment_package_techniques
    WHERE appointment_id = (SELECT id FROM booked)),
  2, 'congela las dos técnicas incluidas en el paquete');

SELECT results_eq(
  $$SELECT technique_name, duration_min, buffer_min
      FROM public.scheduling_appointment_package_techniques
     WHERE appointment_id = (SELECT id FROM booked)
     ORDER BY technique_name$$,
  $$VALUES ('zz-paquete reservable técnica 1'::text, 60, 15),
           ('zz-paquete reservable técnica 2'::text, 30, 5)$$,
  'cada técnica congelada trae su propia duración y limpieza de ese momento');

-- ── Lo que el calendario no ofrece ───────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2027-09-06 09:10-06', '00000000-0000-0000-0000-0000000008d1')$$,
  'P0001', 'scheduling_slot_not_offered', 'un inicio fuera de la grilla de 30 minutos no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2027-09-13 09:00-06', '00000000-0000-0000-0000-0000000008d1')$$,
  'P0001', 'scheduling_slot_not_offered', 'un día cerrado no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2020-01-06 09:00-06', '00000000-0000-0000-0000-0000000008d1')$$,
  'P0001', 'scheduling_slot_not_offered', 'una fecha pasada no se ofrece');

SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-0000000000ff',
      '2027-09-06 13:00-06', '00000000-0000-0000-0000-0000000008d1')$$,
  'P0001', 'scheduling_slot_not_offered', 'un recurso que no existe no se ofrece');

-- ── Lo que ya está ocupado ───────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2027-09-06 09:00-06', '00000000-0000-0000-0000-0000000008d1')$$,
  'P0001', 'scheduling_slot_taken', 'el mismo espacio dos veces: el segundo recibe «ocupado»');

SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2027-09-20 10:30-06', '00000000-0000-0000-0000-0000000008d1')$$,
  'P0001', 'scheduling_slot_taken', 'un bloqueo manual ocupa el espacio — revisado igual que la reserva de técnica');

-- ── Paquete ──────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2027-09-06 14:00-06', '00000000-0000-0000-0000-0000000008d2')$$,
  'P0001', 'scheduling_package_not_available', 'un paquete desactivado no se reserva');

SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2027-09-06 14:00-06', '00000000-0000-0000-0000-00000000bad0')$$,
  'P0001', 'scheduling_package_not_available', 'un paquete que no existe no se reserva');

-- ── Quién reserva ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e3","role":"authenticated"}', true);

SELECT is(
  (SELECT deposit_required FROM public.scheduling_book_package_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 13:00-06',
     '00000000-0000-0000-0000-0000000008d1')),
  0::bigint, 'una clienta exonerada reserva el paquete sin anticipo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e4","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2027-09-06 15:00-06', '00000000-0000-0000-0000-0000000008d1')$$,
  'P0001', 'scheduling_client_not_registered', 'una usuaria sin perfil de clienta no reserva');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_book_package_appointment('00000000-0000-0000-0000-000000000a01',
      '2027-09-06 15:00-06', '00000000-0000-0000-0000-0000000008d1')$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments
    WHERE client_id IN ('00000000-0000-0000-0000-0000000008c6', '00000000-0000-0000-0000-0000000008c7')),
  2, 'los intentos rechazados no dejaron ninguna cita de paquete');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointment_package_techniques t
    JOIN public.scheduling_appointments a ON a.id = t.appointment_id
   WHERE a.client_id IN ('00000000-0000-0000-0000-0000000008c6', '00000000-0000-0000-0000-0000000008c7')),
  4, 'cada una de las dos citas de paquete que se crearon congeló sus dos técnicas');

SELECT is(
  (SELECT pronargs::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'scheduling_book_package_appointment'),
  3, 'la función no recibe ni la clienta ni los montos, solo recurso, hora y paquete');

SELECT * FROM finish();
ROLLBACK;
