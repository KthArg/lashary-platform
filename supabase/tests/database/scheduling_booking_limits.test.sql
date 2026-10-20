-- US-AGE-05 · tope de citas pendientes de aprobación por clienta, editable sin migración.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2027-09-06, abierto 09:00–17:00. Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000008e2', 'limits-a@test.local'),
  ('00000000-0000-0000-0000-0000000008e3', 'limits-b@test.local'),
  ('00000000-0000-0000-0000-0000000008e5', 'limits-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000008e5';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000008c6', '00000000-0000-0000-0000-0000000008e2',
   'Clienta A', 'limits-a@test.local', '+50688880036'),
  ('00000000-0000-0000-0000-0000000008c7', '00000000-0000-0000-0000-0000000008e3',
   'Clienta B', 'limits-b@test.local', '+50688880037');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000008f4', 'zz-test con tope', 'lash_classic',
   35000, 25000, 60, 45, 15, 10000, 'cuidados', true);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

INSERT INTO public.scheduling_appointments
  (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 'pending_approval', '2026-01-05 09:00-06', '2026-01-05 10:00-06',
   tstzrange('2026-01-05 09:00-06', '2026-01-05 10:00-06'), '00000000-0000-0000-0000-0000000008c6',
   '00000000-0000-0000-0000-0000000008f4', 'zz-test', true, 35000, 0);

SELECT is((SELECT max_pending_per_client FROM public.scheduling_booking_limits), 3,
  'el tope arranca en 3 pendientes por clienta');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e2","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
      '00000000-0000-0000-0000-0000000008f4', true);
    SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 10:30-06',
      '00000000-0000-0000-0000-0000000008f4', true);
    SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 12:00-06',
      '00000000-0000-0000-0000-0000000008f4', true)$$,
  'llega al tope: tres pendientes futuras, y una pendiente ya pasada no cuenta');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 13:30-06',
      '00000000-0000-0000-0000-0000000008f4', true)$$,
  'P0001', 'scheduling_too_many_pending',
  'con el tope alcanzado no puede reservar otra mientras no le aprueben o rechacen una');

SELECT is((SELECT count(*) FROM public.scheduling_appointments
            WHERE client_id = '00000000-0000-0000-0000-0000000008c6' AND status = 'pending_approval'
              AND starts_at > now()), 3::bigint,
  'la reserva rechazada por el tope no dejó nada guardado');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e3","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 13:30-06',
      '00000000-0000-0000-0000-0000000008f4', true)$$,
  'el tope es por clienta: la clienta B reserva aunque la A esté en el tope');

SELECT is((SELECT count(*) FROM public.scheduling_booking_limits), 0::bigint,
  'una clienta no lee la tabla de límites');

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 99;

RESET ROLE;

SELECT is((SELECT max_pending_per_client FROM public.scheduling_booking_limits), 3,
  'una clienta no puede cambiar el tope');

UPDATE public.scheduling_appointments SET status = 'approved'
 WHERE client_id = '00000000-0000-0000-0000-0000000008c6' AND starts_at = '2027-09-06 09:00-06';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e2","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 15:00-06',
      '00000000-0000-0000-0000-0000000008f4', true)$$,
  'una cita aprobada deja de contar: al aprobarle una puede reservar otra');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e5","role":"authenticated"}', true);

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 5;

SELECT is((SELECT max_pending_per_client FROM public.scheduling_booking_limits), 5,
  'la administradora cambia el tope con un UPDATE, sin migración');

SELECT throws_ok(
  $$UPDATE public.scheduling_booking_limits SET max_pending_per_client = 0$$,
  '23514', NULL, 'el tope no puede ser menor que 1');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_booking_limits$$,
  '42501', NULL, 'un anónimo no lee la tabla de límites');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
