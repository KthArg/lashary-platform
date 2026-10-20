-- US-AGE-05 · DOM-002 — lo que se congela al reservar no cambia cuando cambia el catálogo.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2027-09-06, abierto 09:00–17:00. Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000006e2', 'frozen-clienta@test.local');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000006c6', '00000000-0000-0000-0000-0000000006e2',
        'Clienta congelada', 'frozen-clienta@test.local', '+50688880016');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000006f4', 'zz-test congelada', 'lash_classic',
   35000, 25000, 60, 45, 15, 10000, 'cuidados', true);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006e2","role":"authenticated"}', true);

CREATE TEMP TABLE booked AS
  SELECT * FROM public.scheduling_book_appointment(
    '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
    '00000000-0000-0000-0000-0000000006f4', true);

GRANT SELECT ON booked TO PUBLIC;

CREATE TEMP TABLE before_change AS
  SELECT technique_name, service_price, deposit_required, deposit_registered, is_first_time,
         starts_at, ends_at, occupied_range
    FROM public.scheduling_appointments WHERE id = (SELECT id FROM booked);

GRANT SELECT ON before_change TO PUBLIC;

RESET ROLE;

UPDATE public.catalog_techniques
   SET name = 'zz-test renombrada', price_first_time = 99000, deposit = 50000,
       duration_first_time_min = 120, buffer_min = 60
 WHERE id = '00000000-0000-0000-0000-0000000006f4';

SELECT results_eq(
  $$SELECT technique_name, service_price, deposit_required, deposit_registered, is_first_time,
           starts_at, ends_at, occupied_range
      FROM public.scheduling_appointments WHERE id = (SELECT id FROM booked)$$,
  $$SELECT technique_name, service_price, deposit_required, deposit_registered, is_first_time,
           starts_at, ends_at, occupied_range FROM before_change$$,
  'cambiar nombre, precio, anticipo, duración y limpieza en el catálogo no altera la cita ya reservada');

SELECT is(
  (SELECT service_price FROM public.scheduling_appointments WHERE id = (SELECT id FROM booked)),
  35000::bigint, 'el precio sigue siendo el de la reserva');

SELECT is(
  (SELECT deposit_required FROM public.scheduling_appointments WHERE id = (SELECT id FROM booked)),
  10000::bigint, 'el anticipo sigue siendo el de la reserva');

SELECT is(
  (SELECT technique_name FROM public.scheduling_appointments WHERE id = (SELECT id FROM booked)),
  'zz-test congelada', 'el nombre sigue siendo el de la reserva');

UPDATE public.catalog_techniques SET is_active = false
 WHERE id = '00000000-0000-0000-0000-0000000006f4';

SELECT results_eq(
  $$SELECT technique_name, service_price, deposit_required, starts_at, ends_at, occupied_range, status
      FROM public.scheduling_appointments WHERE id = (SELECT id FROM booked)$$,
  $$SELECT technique_name, service_price, deposit_required, starts_at, ends_at, occupied_range, 'pending_approval'
      FROM before_change$$,
  'desactivar la técnica no altera la cita ya agendada ni su estado');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006e2","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.scheduling_appointments WHERE id = (SELECT id FROM booked)),
  1::bigint, 'la clienta sigue viendo su cita con la técnica desactivada');

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06 12:00-06',
      '00000000-0000-0000-0000-0000000006f4', true)$$,
  'P0001', 'scheduling_technique_not_available',
  'una técnica desactivada ya no se puede reservar');

RESET ROLE;

UPDATE public.catalog_techniques SET is_active = true, price_first_time = 40000, deposit = 12000
 WHERE id = '00000000-0000-0000-0000-0000000006f4';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006e2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT service_price, deposit_required FROM public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-09-06 13:00-06',
      '00000000-0000-0000-0000-0000000006f4', true)$$,
  $$VALUES (40000::bigint, 12000::bigint)$$,
  'una reserva nueva toma los términos vigentes del catálogo');

SELECT is(
  (SELECT service_price FROM public.scheduling_appointments WHERE id = (SELECT id FROM booked)),
  35000::bigint, 'y la cita anterior conserva su precio congelado');

SELECT * FROM finish();
ROLLBACK;
