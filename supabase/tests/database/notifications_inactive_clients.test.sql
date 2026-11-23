-- notifications_inactive_clients.test.sql
-- US-NOT-06 · notifications — la lista de clientas inactivas (criterio 1): sin visita completada desde la fecha
-- de corte y sin cita próxima en pie, incluidas las que nunca vinieron (decisión del PO, 2026-11-22). Trae si
-- se dio de baja y su último recordatorio. Solo el personal la ve; una clienta recibe una lista vacía (SEC-002).
-- Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000029a1', 'lista-inactivas-b@test.local'),
  ('00000000-0000-0000-0000-0000000029a9', 'lista-inactivas-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000029a9';

-- A nunca vino; B vino hace 200 días; C vino hace 20; D vino hace 200 pero tiene una cita próxima;
-- E vino hace 300 y se dio de baja; F nunca vino y tiene dos recordatorios (el último en cola).
INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000029c1', NULL, 'Lista A nunca vino', 'lista-a@test.local', '+50688882901'),
  ('00000000-0000-0000-0000-0000000029c2', '00000000-0000-0000-0000-0000000029a1', 'Lista B vieja',
   'lista-inactivas-b@test.local', '+50688882902'),
  ('00000000-0000-0000-0000-0000000029c3', NULL, 'Lista C reciente', 'lista-c@test.local', '+50688882903'),
  ('00000000-0000-0000-0000-0000000029c4', NULL, 'Lista D con cita', 'lista-d@test.local', '+50688882904'),
  ('00000000-0000-0000-0000-0000000029c5', NULL, 'Lista E de baja', 'lista-e@test.local', '+50688882905'),
  ('00000000-0000-0000-0000-0000000029c6', NULL, 'Lista F avisada', 'lista-f@test.local', '+50688882906');

INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
SELECT '00000000-0000-0000-0000-000000000a01', s, s + interval '1 hour',
       tstzrange(s, s + interval '75 minutes', '[)'), st, c, '00000000-0000-0000-0000-000000001e01', 'Técnica', false, 1000, 0
  FROM (VALUES
    (date_trunc('hour', now()) - interval '200 days',          'completed', '00000000-0000-0000-0000-0000000029c2'::uuid),
    (date_trunc('hour', now()) - interval '20 days',           'completed', '00000000-0000-0000-0000-0000000029c3'::uuid),
    (date_trunc('hour', now()) - interval '200 days 3 hours',  'completed', '00000000-0000-0000-0000-0000000029c4'::uuid),
    (date_trunc('hour', now()) + interval '9 days',            'approved',  '00000000-0000-0000-0000-0000000029c4'::uuid),
    (date_trunc('hour', now()) - interval '300 days',          'completed', '00000000-0000-0000-0000-0000000029c5'::uuid)
  ) AS v(s, st, c);

INSERT INTO public.notifications_inactive_subscriptions (client_id, opted_out_at)
VALUES ('00000000-0000-0000-0000-0000000029c5', now() - interval '3 days');

INSERT INTO public.notifications_inactive_reminders (client_id, queued_by, status, attempts, last_channel, sent_at, created_at)
VALUES
  ('00000000-0000-0000-0000-0000000029c6', '00000000-0000-0000-0000-0000000029a9', 'sent', 1, 'email',
   now() - interval '40 days', now() - interval '40 days'),
  ('00000000-0000-0000-0000-0000000029c6', '00000000-0000-0000-0000-0000000029a9', 'pending', 0, NULL,
   NULL, now() - interval '1 hour');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000029a9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id FROM public.notifications_inactive_clients(now() - interval '180 days')
     WHERE client_id::text LIKE '00000000-0000-0000-0000-0000000029c%'
     ORDER BY client_id$$,
  $$VALUES ('00000000-0000-0000-0000-0000000029c1'::uuid), ('00000000-0000-0000-0000-0000000029c2'::uuid),
           ('00000000-0000-0000-0000-0000000029c5'::uuid), ('00000000-0000-0000-0000-0000000029c6'::uuid)$$,
  'inactivas: la que nunca vino, la de visita vieja y la de baja; no la reciente ni la que tiene cita próxima');

SELECT is(
  (SELECT full_name || '|' || last_visit_at::date FROM public.notifications_inactive_clients(now() - interval '180 days')
    WHERE client_id = '00000000-0000-0000-0000-0000000029c2'),
  'Lista B vieja|' || (date_trunc('hour', now()) - interval '200 days')::date,
  'trae el nombre y la última visita');

SELECT is(
  (SELECT last_visit_at FROM public.notifications_inactive_clients(now() - interval '180 days')
    WHERE client_id = '00000000-0000-0000-0000-0000000029c1'),
  NULL::timestamptz, 'la que nunca vino no tiene última visita');

SELECT results_eq(
  $$SELECT client_id, opted_out FROM public.notifications_inactive_clients(now() - interval '180 days')
     WHERE client_id IN ('00000000-0000-0000-0000-0000000029c5', '00000000-0000-0000-0000-0000000029c1')
     ORDER BY client_id$$,
  $$VALUES ('00000000-0000-0000-0000-0000000029c1'::uuid, false), ('00000000-0000-0000-0000-0000000029c5'::uuid, true)$$,
  'dice quién se dio de baja; sin fila de suscripción es que está suscrita');

SELECT is(
  (SELECT last_reminder_status || '|' || (last_reminder_sent_at IS NULL)
     FROM public.notifications_inactive_clients(now() - interval '180 days')
    WHERE client_id = '00000000-0000-0000-0000-0000000029c6'),
  'pending|true', 'trae el último recordatorio, aunque haya otro anterior ya enviado');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_inactive_clients(now() - interval '10 days')
    WHERE client_id = '00000000-0000-0000-0000-0000000029c3'),
  1, 'el rango es configurable: con un corte de 10 días, la de hace 20 también es inactiva');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000029a1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_inactive_clients(now() - interval '180 days')),
  0, 'una clienta no ve la lista, ni a sí misma');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT * FROM public.notifications_inactive_clients(now())$$, '42501', NULL,
  'un anónimo no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT prosecdef FROM pg_proc
    WHERE oid = 'public.notifications_inactive_clients(timestamptz)'::regprocedure),
  false, 'corre con los permisos de quien llama, así que la RLS de cada feature sigue decidiendo');

SELECT * FROM finish();
ROLLBACK;
