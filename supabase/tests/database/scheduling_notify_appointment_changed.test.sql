-- US-NOT-02 · cancelar o reagendar deja un aviso en la bandeja de la administradora.
-- Correr con: npx supabase test db
-- Lunes de prueba: 2047-09-02, 2047-09-09, 2047-09-16, 2047-09-23 y 2047-09-30, abiertos de 09:00 a 17:00.
-- Hora de Costa Rica, UTC-6.

BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000004a2', 'aviso-cambio-a@test.local'),
  ('00000000-0000-0000-0000-0000000004a5', 'aviso-cambio-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000004a5';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000004c6', '00000000-0000-0000-0000-0000000004a2',
        'Ana Mora', 'aviso-cambio-a@test.local', '+50688880091');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);
UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;
UPDATE public.scheduling_reschedule_policy SET max_reschedules = 3;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, decided_by, decided_at)
VALUES
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-09-02 09:00-06', '2047-09-02 10:00-06', tstzrange('2047-09-02 09:00-06', '2047-09-02 10:15-06'),
   '00000000-0000-0000-0000-0000000004c6', '00000000-0000-0000-0000-0000000004f4', 'zz-test aviso',
   true, 35000, 10000, 10000, '00000000-0000-0000-0000-0000000004a5', now()),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-09-16 09:00-06', '2047-09-16 10:00-06', tstzrange('2047-09-16 09:00-06', '2047-09-16 10:15-06'),
   '00000000-0000-0000-0000-0000000004c6', '00000000-0000-0000-0000-0000000004f4', 'zz-test aviso',
   true, 35000, 10000, 10000, '00000000-0000-0000-0000-0000000004a5', now()),
  ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '10 hours', now() + interval '11 hours',
   tstzrange(now() + interval '10 hours', now() + interval '11 hours 15 minutes'),
   '00000000-0000-0000-0000-0000000004c6', '00000000-0000-0000-0000-0000000004f4', 'zz-test aviso',
   true, 35000, 10000, 10000, '00000000-0000-0000-0000-0000000004a5', now()),
  ('00000000-0000-0000-0000-00000000aa04', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-09-23 09:00-06', '2047-09-23 10:00-06', tstzrange('2047-09-23 09:00-06', '2047-09-23 10:15-06'),
   '00000000-0000-0000-0000-0000000004c6', '00000000-0000-0000-0000-0000000004f4', 'zz-test aviso',
   true, 35000, 10000, 10000, '00000000-0000-0000-0000-0000000004a5', now()),
  ('00000000-0000-0000-0000-00000000aa05', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-09-16 13:00-06', '2047-09-16 14:00-06', tstzrange('2047-09-16 13:00-06', '2047-09-16 14:15-06'),
   '00000000-0000-0000-0000-0000000004c6', '00000000-0000-0000-0000-0000000004f4', 'zz-test aviso',
   true, 35000, 10000, 10000, '00000000-0000-0000-0000-0000000004a5', now());

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004a2","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000aa01', '2047-09-09 09:00-06', 'approved')$$,
  'la clienta reagenda su cita');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_busy_ranges('00000000-0000-0000-0000-000000000a01', '2047-09-16')),
  2, 'antes de cancelar, el calendario de la clienta ve ocupadas las dos citas del 16');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000aa02', 0)$$,
  $$VALUES (true, 0::bigint)$$,
  'la clienta cancela con antelación, sin perder el anticipo');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_busy_ranges('00000000-0000-0000-0000-000000000a01', '2047-09-16')),
  1, 'el espacio cancelado se libera en el calendario de la clienta (criterio 4)');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000aa03', 0)$$,
  'scheduling_cancellation_consequence_changed', 'una cancelación que no se guarda no deja aviso (parte 1: falla)');

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000aa03', 10000)$$,
  'la clienta cancela tarde y pierde el anticipo');

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_reschedule_appointment(
      '00000000-0000-0000-0000-00000000aa04', '2047-09-30 09:00-06', 'approved')$$,
  'la clienta reagenda otra cita');

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000aa04', 0)$$,
  'y la cancela con el reagendado todavía sin decidir');

RESET ROLE;

SELECT results_eq(
  $$SELECT client_name, service_name, previous_starts_at, starts_at, read_at IS NULL
      FROM public.notifications_admin_inbox
     WHERE kind = 'appointment_rescheduled' AND appointment_id = '00000000-0000-0000-0000-00000000aa01'$$,
  $$VALUES ('Ana Mora'::text, 'zz-test aviso'::text, '2047-09-02 09:00-06'::timestamptz,
            '2047-09-09 09:00-06'::timestamptz, true)$$,
  'reagendar deja un aviso sin leer con la clienta, el servicio, el horario anterior y el nuevo (criterios 1 y 3)');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox
    WHERE kind = 'booking_created' AND appointment_id = '00000000-0000-0000-0000-00000000aa01'),
  0, 'reagendar no se avisa como una reserva nueva');

SELECT results_eq(
  $$SELECT appointment_id, client_name, service_name, starts_at, forfeited_deposit
      FROM public.notifications_admin_inbox
     WHERE kind = 'appointment_cancelled' AND appointment_id IN (
       '00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-00000000aa03')
     ORDER BY forfeited_deposit$$,
  $$VALUES
    ('00000000-0000-0000-0000-00000000aa02'::uuid, 'Ana Mora'::text, 'zz-test aviso'::text,
     '2047-09-16 09:00-06'::timestamptz, 0::bigint),
    ('00000000-0000-0000-0000-00000000aa03'::uuid, 'Ana Mora'::text, 'zz-test aviso'::text,
     (SELECT starts_at FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000aa03'),
     10000::bigint)$$,
  'cancelar deja un aviso por cita, con el anticipo perdido según la política (criterios 1 y 2); la que falló no dejó otro');

SELECT is(
  (SELECT starts_at FROM public.notifications_admin_inbox
    WHERE kind = 'appointment_cancelled' AND appointment_id = '00000000-0000-0000-0000-00000000aa04'),
  '2047-09-23 09:00-06'::timestamptz,
  'cancelar con un reagendado sin decidir avisa el horario aprobado, el que estaba en la agenda');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004a5","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT * FROM public.scheduling_decide_appointment(
      '00000000-0000-0000-0000-00000000aa01', 'approved', NULL, '2047-09-09 09:00-06')$$,
  'la administradora aprueba el reagendado');
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_busy_ranges('00000000-0000-0000-0000-000000000a01', '2047-09-02')),
  0, 'al aprobar el reagendado, el horario anterior se libera en el calendario (criterio 4)');
RESET ROLE;

ALTER TABLE public.notifications_admin_inbox ADD CONSTRAINT zz_test_rejects_every_notice CHECK (false) NOT VALID;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004a2","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000aa05', 0)$$,
  'si el aviso no se puede guardar, la cancelación igual se hace');
RESET ROLE;
SELECT is((SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000aa05'),
  'cancelled', 'la cita quedó cancelada, aunque sin aviso');

SELECT * FROM finish();
ROLLBACK;
