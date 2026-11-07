-- US-NOT-02 · el aviso a la clienta se descarta si la cita vuelve a cambiar y el cron solo toma avisos vigentes.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(7);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000008a1', 'aviso-vigente-admin@test.local'),
  ('00000000-0000-0000-0000-0000000008a2', 'aviso-vigente-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000008a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000008c2', '00000000-0000-0000-0000-0000000008a2',
        'Clienta', 'aviso-vigente-clienta@test.local', '+50688880096');

DELETE FROM public.notifications_client_notices;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-10-07 15:00+00', '2047-10-07 16:00+00', tstzrange('2047-10-07 15:00+00', '2047-10-07 16:15+00'),
   '00000000-0000-0000-0000-0000000008c2', '00000000-0000-0000-0000-0000000008f1', 'zz-test vigente',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-0000000008e2', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-10-08 15:00+00', '2047-10-08 16:00+00', tstzrange('2047-10-08 15:00+00', '2047-10-08 16:15+00'),
   '00000000-0000-0000-0000-0000000008c2', '00000000-0000-0000-0000-0000000008f1', 'zz-test movida',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-0000000008e3', '00000000-0000-0000-0000-000000000a01', 'cancelled',
   '2047-10-09 15:00+00', '2047-10-09 16:00+00', tstzrange('2047-10-09 15:00+00', '2047-10-09 16:15+00'),
   '00000000-0000-0000-0000-0000000008c2', '00000000-0000-0000-0000-0000000008f1', 'zz-test cancelada',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-0000000008e4', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-09-20 15:00+00', '2047-09-20 16:00+00', tstzrange('2047-09-20 15:00+00', '2047-09-20 16:15+00'),
   '00000000-0000-0000-0000-0000000008c2', '00000000-0000-0000-0000-0000000008f1', 'zz-test pasada',
   true, 35000, 10000, 10000);

INSERT INTO public.notifications_client_notices
  (id, kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at)
VALUES
  ('00000000-0000-0000-0000-0000000008d1', 'reschedule_rejected', gen_random_uuid(), '00000000-0000-0000-0000-0000000008e1',
   '00000000-0000-0000-0000-0000000008c2', 'vigente', '2047-10-14 15:00+00', '2047-10-07 15:00+00'),
  ('00000000-0000-0000-0000-0000000008d2', 'reschedule_rejected', gen_random_uuid(), '00000000-0000-0000-0000-0000000008e2',
   '00000000-0000-0000-0000-0000000008c2', 'movida', '2047-10-14 15:00+00', '2047-10-07 15:00+00'),
  ('00000000-0000-0000-0000-0000000008d3', 'reschedule_expired', gen_random_uuid(), '00000000-0000-0000-0000-0000000008e3',
   '00000000-0000-0000-0000-0000000008c2', 'cancelada', '2047-10-14 15:00+00', '2047-10-09 15:00+00'),
  ('00000000-0000-0000-0000-0000000008d4', 'reschedule_rejected', gen_random_uuid(), '00000000-0000-0000-0000-0000000008e4',
   '00000000-0000-0000-0000-0000000008c2', 'pasada', '2047-09-27 15:00+00', '2047-09-20 15:00+00');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008a1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT service_name FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 10, 10)$$,
  $$VALUES ('vigente'::text)$$,
  'solo se reclama el aviso de una cita viva que sigue en la fecha conservada y que todavía no pasó');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices WHERE status = 'pending'), 3,
  'los avisos que no se reclaman quedan como estaban');

INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id)
VALUES ('00000000-0000-0000-0000-0000000008a2', 'scheduling.appointment.rescheduled', 'scheduling_appointment',
        '00000000-0000-0000-0000-0000000008e2');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices WHERE appointment_id = '00000000-0000-0000-0000-0000000008e2'), 0,
  'si la cita vuelve a reagendarse, su aviso se descarta');

INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id)
VALUES ('00000000-0000-0000-0000-0000000008a2', 'scheduling.appointment.cancelled', 'scheduling_appointment',
        '00000000-0000-0000-0000-0000000008e1');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices WHERE appointment_id = '00000000-0000-0000-0000-0000000008e1'), 0,
  'si la clienta cancela después del rechazo, su aviso se descarta');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices), 2,
  'los avisos de otras citas no se tocan');

INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id)
VALUES ('00000000-0000-0000-0000-0000000008a2', 'scheduling.appointment.reschedule_reverted', 'scheduling_appointment',
        '00000000-0000-0000-0000-0000000008e4');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices WHERE appointment_id = '00000000-0000-0000-0000-0000000008e4'), 1,
  'otros eventos de la cita no descartan el aviso');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008a2","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.notifications_discard_client_notices('00000000-0000-0000-0000-0000000008e4', now())$$,
  '42501', NULL, 'nadie descarta avisos llamando a la función a mano');

SELECT * FROM finish();
ROLLBACK;
