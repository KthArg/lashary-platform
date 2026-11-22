-- notifications_claim_inactive_reminders.test.sql
-- US-NOT-06 · notifications — el ciclo reclama los recordatorios a inactivas en cola, con el nombre y el token de
-- baja de cada clienta para armar el mensaje. Salta a quien se dio de baja después de ponerse en cola y deja ese
-- recordatorio como fallido (criterio 4: se respeta en envíos posteriores), respeta el tamaño del lote y reclama
-- de nuevo un reclamo vencido. Solo el personal; todo se deshace con ROLLBACK y no se usa la service-role key
-- (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000002ba1', 'reclamo-clienta@test.local'),
  ('00000000-0000-0000-0000-000000002ba9', 'reclamo-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000002ba9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000002bc1', '00000000-0000-0000-0000-000000002ba1', 'Reclamo A',
   'reclamo-clienta@test.local', '+50688883101'),
  ('00000000-0000-0000-0000-000000002bc2', NULL, 'Reclamo B', 'reclamo-b@test.local', '+50688883102'),
  ('00000000-0000-0000-0000-000000002bc3', NULL, 'Reclamo C de baja', 'reclamo-c@test.local', '+50688883103'),
  ('00000000-0000-0000-0000-000000002bc4', NULL, 'Reclamo D reclamado', 'reclamo-d@test.local', '+50688883104');

INSERT INTO public.notifications_inactive_subscriptions (client_id, token, opted_out_at)
VALUES
  ('00000000-0000-0000-0000-000000002bc1', '00000000-0000-0000-0000-000000002bf1', NULL),
  ('00000000-0000-0000-0000-000000002bc2', '00000000-0000-0000-0000-000000002bf2', NULL),
  ('00000000-0000-0000-0000-000000002bc3', '00000000-0000-0000-0000-000000002bf3', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000002bc4', '00000000-0000-0000-0000-000000002bf4', NULL);

INSERT INTO public.notifications_inactive_reminders (id, client_id, queued_by, status, claimed_at, created_at)
VALUES
  ('00000000-0000-0000-0000-000000002bd1', '00000000-0000-0000-0000-000000002bc1', '00000000-0000-0000-0000-000000002ba9',
   'pending', NULL, now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000002bd2', '00000000-0000-0000-0000-000000002bc2', '00000000-0000-0000-0000-000000002ba9',
   'pending', NULL, now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000002bd3', '00000000-0000-0000-0000-000000002bc3', '00000000-0000-0000-0000-000000002ba9',
   'pending', NULL, now() - interval '4 hours'),
  ('00000000-0000-0000-0000-000000002bd4', '00000000-0000-0000-0000-000000002bc4', '00000000-0000-0000-0000-000000002ba9',
   'claimed', now() - interval '5 minutes', now() - interval '5 hours');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000002ba9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT id, full_name, token FROM public.notifications_claim_inactive_reminders(now(), 1, 15)$$,
  $$VALUES ('00000000-0000-0000-0000-000000002bd1'::uuid, 'Reclamo A'::text, '00000000-0000-0000-0000-000000002bf1'::uuid)$$,
  'reclama el más antiguo en cola, con el nombre y el token de baja; respeta el tamaño del lote');

SELECT is(
  (SELECT status || '|' || coalesce(last_error, '') FROM public.notifications_inactive_reminders
    WHERE id = '00000000-0000-0000-0000-000000002bd3'),
  'failed|la clienta se dio de baja antes del envío',
  'la que se dio de baja después de ponerse en cola no se reclama: su recordatorio queda fallido con el motivo');

SELECT results_eq(
  $$SELECT id FROM public.notifications_claim_inactive_reminders(now(), 10, 15)$$,
  $$VALUES ('00000000-0000-0000-0000-000000002bd2'::uuid)$$,
  'en la siguiente corrida reclama el que quedaba; no el ya reclamado hace 5 minutos, que no venció');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_inactive_reminders
    WHERE client_id::text LIKE '00000000-0000-0000-0000-000000002bc%' AND status = 'claimed'),
  3, 'los reclamados quedan claimed, con su fecha');

SELECT results_eq(
  $$SELECT id FROM public.notifications_claim_inactive_reminders(now() + interval '20 minutes', 10, 15)$$,
  $$VALUES ('00000000-0000-0000-0000-000000002bd4'::uuid), ('00000000-0000-0000-0000-000000002bd1'::uuid),
           ('00000000-0000-0000-0000-000000002bd2'::uuid)$$,
  'pasado el tiempo del reclamo, los reclamados vencidos se reclaman de nuevo, del más antiguo al más nuevo');

SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_inactive_reminders(now(), 0, 15)$$,
  '22023', NULL, 'un lote de cero se rechaza');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000002ba1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_inactive_reminders(now(), 10, 15)$$,
  '42501', NULL, 'una clienta no reclama recordatorios');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_inactive_reminders(now(), 10, 15)$$,
  '42501', NULL, 'un anónimo no reclama recordatorios');

RESET ROLE;

SELECT is(
  (SELECT prosecdef AND proconfig @> ARRAY['search_path=public, pg_temp'] FROM pg_proc
    WHERE oid = 'public.notifications_claim_inactive_reminders(timestamptz, integer, integer)'::regprocedure),
  true, 'SECURITY DEFINER con search_path fijo');

SELECT ok(
  NOT has_function_privilege('anon', 'public.notifications_claim_inactive_reminders(timestamptz, integer, integer)', 'EXECUTE'),
  'anon no tiene EXECUTE');

SELECT * FROM finish();
ROLLBACK;
