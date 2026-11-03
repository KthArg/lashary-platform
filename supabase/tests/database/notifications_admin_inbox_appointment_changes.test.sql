BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000002a1', 'staff-admin-not02@test.local'),
  ('00000000-0000-0000-0000-0000000002c1', 'clienta-not02@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000002a1';

SELECT public.notifications_record_cancellation(
  '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000c001',
  'Ana Pérez', 'Lifting de pestañas', '2026-11-05 15:00:00+00', 10000);
SELECT public.notifications_record_cancellation(
  '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000c001',
  'Ana Pérez', 'Lifting de pestañas', '2026-11-05 15:00:00+00', 10000);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE event_id = '00000000-0000-0000-0000-00000000e001'),
  1, 'registrar dos veces el mismo evento de cancelación deja un solo aviso');

SELECT is(
  (SELECT kind || ' · ' || forfeited_deposit FROM public.notifications_admin_inbox
    WHERE event_id = '00000000-0000-0000-0000-00000000e001'),
  'appointment_cancelled · 10000', 'la cancelación guarda el anticipo perdido');

SELECT public.notifications_record_reschedule(
  '00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000c002',
  'Eva Solís', 'Extensiones', '2026-11-06 15:00:00+00', '2026-11-07 18:00:00+00');
SELECT public.notifications_record_reschedule(
  '00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-00000000c002',
  'Eva Solís', 'Extensiones', '2026-11-07 18:00:00+00', '2026-11-08 18:00:00+00');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-00000000c002'),
  2, 'cada reagendado de la misma cita deja su propio aviso');

SELECT is(
  (SELECT previous_starts_at || ' → ' || starts_at FROM public.notifications_admin_inbox
    WHERE event_id = '00000000-0000-0000-0000-00000000e002'),
  '2026-11-06 15:00:00+00 → 2026-11-07 18:00:00+00', 'el reagendado guarda el horario anterior y el nuevo');

SELECT public.notifications_record_booking(
  '00000000-0000-0000-0000-00000000c002', 'Eva Solís', 'Extensiones', '2026-11-06 15:00:00+00');
SELECT public.notifications_record_booking(
  '00000000-0000-0000-0000-00000000c002', 'Eva Solís', 'Extensiones', '2026-11-06 15:00:00+00');
SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox
    WHERE appointment_id = '00000000-0000-0000-0000-00000000c002' AND kind = 'booking_created'),
  1, 'la reserva sigue dejando un solo aviso, junto a los de sus reagendados');

SELECT throws_ok(
  $$INSERT INTO public.notifications_admin_inbox (kind, event_id, appointment_id, client_name, service_name, starts_at)
    VALUES ('appointment_cancelled', gen_random_uuid(), gen_random_uuid(), 'X', 'Y', now())$$,
  '23514', NULL, 'una cancelación sin el anticipo perdido se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.notifications_admin_inbox (kind, event_id, appointment_id, client_name, service_name, starts_at)
    VALUES ('appointment_rescheduled', gen_random_uuid(), gen_random_uuid(), 'X', 'Y', now())$$,
  '23514', NULL, 'un reagendado sin el horario anterior se rechaza');

SELECT throws_ok(
  $$SELECT public.notifications_record_cancellation(gen_random_uuid(), gen_random_uuid(), 'X', 'Y', now(), -1)$$,
  '23514', NULL, 'un anticipo perdido negativo se rechaza');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002a1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox
    WHERE appointment_id IN ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000c002')),
  4, 'staff: ve los avisos de cancelación, de reagendado y de reserva');

SELECT throws_ok(
  $$SELECT public.notifications_record_cancellation(gen_random_uuid(), gen_random_uuid(), 'X', 'Y', now(), 0)$$,
  '42501', NULL, 'staff: no fabrica avisos de cancelación');

SELECT throws_ok(
  $$SELECT public.notifications_record_reschedule(gen_random_uuid(), gen_random_uuid(), 'X', 'Y', now(), now())$$,
  '42501', NULL, 'staff: no fabrica avisos de reagendado');

SELECT throws_ok(
  $$UPDATE public.notifications_admin_inbox SET forfeited_deposit = 0 WHERE event_id = '00000000-0000-0000-0000-00000000e001'$$,
  '42501', NULL, 'staff: no cambia el anticipo perdido, solo read_at');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002c1","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox), 0, 'clienta: no ve ningún aviso');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT count(*) FROM public.notifications_admin_inbox$$,
  '42501', NULL, 'anon: no lee la bandeja');

SELECT * FROM finish();
ROLLBACK;
