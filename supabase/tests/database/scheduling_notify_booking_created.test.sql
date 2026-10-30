BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000006e1', 'notify-clienta@test.local');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006e1',
        'Clienta Aviso', 'notify-clienta@test.local', '+50688880061');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES ('00000000-0000-0000-0000-0000000006f1', 'zz-test aviso', 'lash_classic',
        35000, 25000, 60, 45, 15, 10000, 'cuidados', true);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
VALUES ('00000000-0000-0000-0000-000000000a01', '2027-10-11', 'non_working');

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006e1","role":"authenticated"}', true);

CREATE TEMP TABLE booked AS
  SELECT * FROM public.scheduling_book_appointment(
    '00000000-0000-0000-0000-000000000a01', '2027-10-04 09:00-06',
    '00000000-0000-0000-0000-0000000006f1', true);

SELECT throws_ok(
  $$SELECT public.scheduling_book_appointment(
      '00000000-0000-0000-0000-000000000a01', '2027-10-11 09:00-06',
      '00000000-0000-0000-0000-0000000006f1', true)$$,
  NULL, NULL, 'una reserva en un día cerrado falla');

RESET ROLE;

SELECT results_eq(
  $$SELECT kind, client_name, service_name, starts_at, read_at IS NULL
      FROM public.notifications_admin_inbox WHERE appointment_id = (SELECT id FROM booked)$$,
  $$VALUES ('booking_created'::text, 'Clienta Aviso'::text, 'zz-test aviso'::text,
            '2027-10-04 09:00-06'::timestamptz, true)$$,
  'reservar crea un aviso sin leer con clienta, servicio, fecha y hora');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE client_name = 'Clienta Aviso'),
  1, 'la reserva que falló no deja aviso');

UPDATE public.scheduling_appointments
   SET starts_at = '2027-10-04 13:00-06', ends_at = '2027-10-04 14:00-06',
       occupied_range = tstzrange('2027-10-04 13:00-06', '2027-10-04 14:15-06')
 WHERE id = (SELECT id FROM booked);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE appointment_id = (SELECT id FROM booked)),
  1, 'cambiar la hora de la cita no crea otro aviso');

SELECT is(
  (SELECT starts_at FROM public.notifications_admin_inbox WHERE appointment_id = (SELECT id FROM booked)),
  '2027-10-04 09:00-06'::timestamptz, 'el aviso conserva la hora con que se reservó');

INSERT INTO public.scheduling_appointments (id, resource_id, starts_at, ends_at, occupied_range)
VALUES ('00000000-0000-0000-0000-0000000006a1', '00000000-0000-0000-0000-000000000a01',
        '2027-10-04 15:00-06', '2027-10-04 16:00-06',
        tstzrange('2027-10-04 15:00-06', '2027-10-04 16:00-06'));

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-0000000006a1'),
  0, 'una cita sin clienta no crea aviso');

CREATE TEMP TABLE package_column AS
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'scheduling_appointments' AND column_name = 'package_name'
  ) AS present;

DO $$
BEGIN
  IF (SELECT present FROM package_column) THEN
    EXECUTE $insert$
      INSERT INTO public.scheduling_appointments
        (id, resource_id, starts_at, ends_at, occupied_range,
         client_id, package_id, package_name, service_price, deposit_required)
      VALUES ('00000000-0000-0000-0000-0000000006a2', '00000000-0000-0000-0000-000000000a01',
              '2027-10-04 16:30-06', '2027-10-04 17:00-06',
              tstzrange('2027-10-04 16:30-06', '2027-10-04 17:00-06'),
              '00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006b1',
              'zz-test paquete', 50000, 10000)
    $insert$;
  END IF;
END;
$$;

SELECT CASE WHEN (SELECT present FROM package_column)
  THEN is(
    (SELECT service_name FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-0000000006a2'),
    'zz-test paquete', 'una reserva de paquete usa el nombre del paquete como servicio')
  ELSE skip('la columna package_name llega con US-AGE-04', 1)
END;

ALTER TABLE public.notifications_admin_inbox
  ADD CONSTRAINT zz_test_rejects_every_notice CHECK (false) NOT VALID;

INSERT INTO public.scheduling_appointments
  (id, resource_id, starts_at, ends_at, occupied_range,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES ('00000000-0000-0000-0000-0000000006a3', '00000000-0000-0000-0000-000000000a01',
        '2027-10-04 18:00-06', '2027-10-04 18:30-06',
        tstzrange('2027-10-04 18:00-06', '2027-10-04 18:30-06'),
        '00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006f1',
        'zz-test aviso', true, 35000, 10000);

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-0000000006a3'),
  1, 'si el aviso no se puede guardar, la reserva igual se guarda');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-0000000006a3'),
  0, 'y ese aviso fallido no queda a medias');

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.scheduling_notify_booking_created()$$,
  '42501', NULL, 'clienta: no puede ejecutar la función del trigger');

SELECT * FROM finish();
ROLLBACK;
