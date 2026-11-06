-- US-NOT-02 · el cron reintenta los avisos que no se pudieron registrar.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000011a1', 'reintento-admin@test.local'),
  ('00000000-0000-0000-0000-0000000011a2', 'reintento-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000011a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000011c2', '00000000-0000-0000-0000-0000000011a2',
        'Clienta', 'reintento-clienta@test.local', '+50688880099');

DELETE FROM public.notifications_dropped_notices;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-0000000011e1', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-10-07 15:00+00', '2047-10-07 16:00+00', tstzrange('2047-10-07 15:00+00', '2047-10-07 16:15+00'),
   '00000000-0000-0000-0000-0000000011c2', '00000000-0000-0000-0000-0000000011f1', 'zz-test reintento',
   true, 35000, 10000, 10000);

INSERT INTO public.audit_events (id, actor_id, action, entity_type, entity_id, payload, created_at)
VALUES
  ('00000000-0000-0000-0000-0000000011b1', '00000000-0000-0000-0000-0000000011a2',
   'scheduling.appointment.rescheduled', 'scheduling_appointment', '00000000-0000-0000-0000-0000000011e1',
   '{"previousStartsAt":"2047-10-07T15:00:00Z","newStartsAt":"2047-10-14T15:00:00Z"}', '2026-01-01 10:00+00'),
  ('00000000-0000-0000-0000-0000000011b2', '00000000-0000-0000-0000-0000000011a2',
   'scheduling.appointment.reschedule_reverted', 'scheduling_appointment', '00000000-0000-0000-0000-0000000011e1',
   '{"rejectedStartsAt":"2047-10-14T15:00:00Z","restoredStartsAt":"2047-10-07T15:00:00Z"}', '2026-01-02 10:00+00'),
  ('00000000-0000-0000-0000-0000000011b3', '00000000-0000-0000-0000-0000000011a2',
   'scheduling.appointment.cancelled', 'scheduling_appointment', '00000000-0000-0000-0000-0000000011e1',
   '{"startsAt":"no-es-fecha"}', '2026-01-03 10:00+00');

DELETE FROM public.notifications_admin_inbox WHERE event_id IN ('00000000-0000-0000-0000-0000000011b1');
DELETE FROM public.notifications_client_notices WHERE appointment_id = '00000000-0000-0000-0000-0000000011e1';
DELETE FROM public.notifications_dropped_notices;

SELECT public.notifications_log_dropped_notice('00000000-0000-0000-0000-0000000011b1',
  'scheduling.appointment.rescheduled', '00000000-0000-0000-0000-0000000011e1', 'falló por un dato transitorio');
SELECT public.notifications_log_dropped_notice('00000000-0000-0000-0000-0000000011b2',
  'scheduling.appointment.reschedule_reverted', '00000000-0000-0000-0000-0000000011e1', 'falló por un dato transitorio');
SELECT public.notifications_log_dropped_notice('00000000-0000-0000-0000-0000000011b3',
  'scheduling.appointment.cancelled', '00000000-0000-0000-0000-0000000011e1', 'sigue roto');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000011a2","role":"authenticated"}', true);
SELECT throws_ok($$SELECT * FROM public.notifications_reconcile_dropped_notices()$$,
  '42501', NULL, 'la clienta no reintenta avisos perdidos');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000011a1","role":"authenticated"}', true);
SELECT results_eq(
  $$SELECT resolved, still_open FROM public.notifications_reconcile_dropped_notices()$$,
  $$VALUES (2, 1)$$,
  'resuelve los dos que fallaron por un dato transitorio y deja abierto el que sigue roto');

SELECT results_eq(
  $$SELECT event_id FROM public.notifications_admin_inbox WHERE event_id = '00000000-0000-0000-0000-0000000011b1'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000011b1'::uuid)$$,
  'el aviso de la administradora se registra al reintentar');
SELECT results_eq(
  $$SELECT kind, status FROM public.notifications_client_notices WHERE appointment_id = '00000000-0000-0000-0000-0000000011e1'$$,
  $$VALUES ('reschedule_rejected'::text, 'pending'::text)$$,
  'el aviso a la clienta se registra al reintentar');

RESET ROLE;
SELECT results_eq(
  $$SELECT event_id, resolved_at IS NOT NULL, attempts FROM public.notifications_dropped_notices ORDER BY event_id$$,
  $$VALUES
    ('00000000-0000-0000-0000-0000000011b1'::uuid, true, 0),
    ('00000000-0000-0000-0000-0000000011b2'::uuid, true, 0),
    ('00000000-0000-0000-0000-0000000011b3'::uuid, false, 1)$$,
  'los resueltos quedan marcados y el que sigue roto suma un intento');
SELECT isnt(
  (SELECT error FROM public.notifications_dropped_notices WHERE event_id = '00000000-0000-0000-0000-0000000011b3'),
  'sigue roto', 'el error del último intento reemplaza al anterior');
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT resolved, still_open FROM public.notifications_reconcile_dropped_notices()$$,
  $$VALUES (0, 1)$$,
  'reintentar otra vez no repite lo resuelto');
SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE event_id = '00000000-0000-0000-0000-0000000011b1'), 1,
  'el aviso de la administradora no se duplica');
SELECT is(
  (SELECT count(*)::int FROM public.notifications_client_notices WHERE appointment_id = '00000000-0000-0000-0000-0000000011e1'), 1,
  'el aviso a la clienta no se duplica');

RESET ROLE;
SELECT public.notifications_log_dropped_notice(gen_random_uuid(), 'scheduling.appointment.cancelled', NULL, 'evento que no existe');
SET LOCAL ROLE authenticated;
SELECT results_eq(
  $$SELECT resolved, still_open FROM public.notifications_reconcile_dropped_notices()$$,
  $$VALUES (0, 2)$$,
  'un evento que ya no existe queda abierto, no tumba el resto');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.notifications_reconcile_dropped_notices()$$,
  '42501', NULL, 'anon no reintenta');

SELECT * FROM finish();
ROLLBACK;
