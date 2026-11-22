-- notifications_inactive_queue_and_optout.test.sql
-- US-NOT-06 · notifications — poner recordatorios en cola (criterio 2: individual o masivo) y darse de baja o
-- volver a suscribirse con el token del enlace (criterio 4). Poner en cola es solo para la administradora: deja
-- fuera a quien se dio de baja, a quien ya está en cola, a quien recibió uno hace poco y a ids que no son de una
-- clienta, respeta el tope por envío y deja el evento en la bitácora. La baja la ejecuta anon con el token, es
-- idempotente y responde igual ante un token que no existe. Todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(22);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000002aa1', 'cola-clienta@test.local'),
  ('00000000-0000-0000-0000-000000002aa9', 'cola-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000002aa9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000002ac1', '00000000-0000-0000-0000-000000002aa1', 'Cola A',
   'cola-clienta@test.local', '+50688883001'),
  ('00000000-0000-0000-0000-000000002ac2', NULL, 'Cola B', 'cola-b@test.local', '+50688883002'),
  ('00000000-0000-0000-0000-000000002ac3', NULL, 'Cola C de baja', 'cola-c@test.local', '+50688883003'),
  ('00000000-0000-0000-0000-000000002ac4', NULL, 'Cola D avisada hace poco', 'cola-d@test.local', '+50688883004');

INSERT INTO public.notifications_inactive_subscriptions (client_id, token, opted_out_at)
VALUES
  ('00000000-0000-0000-0000-000000002ac3', '00000000-0000-0000-0000-000000002af3', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000002ac4', '00000000-0000-0000-0000-000000002af4', NULL);

INSERT INTO public.notifications_inactive_reminders (client_id, queued_by, status, attempts, last_channel, sent_at, created_at)
VALUES ('00000000-0000-0000-0000-000000002ac4', '00000000-0000-0000-0000-000000002aa9', 'sent', 1, 'email',
        now() - interval '10 days', now() - interval '10 days');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000002aa9","role":"authenticated"}', true);

-- ── Poner en cola ──────────────────────────────────────────────────────────────
SELECT results_eq(
  $$SELECT queued, already_queued, opted_out, recent, unknown
      FROM public.notifications_queue_inactive_reminders(
        ARRAY['00000000-0000-0000-0000-000000002ac1', '00000000-0000-0000-0000-000000002ac2',
              '00000000-0000-0000-0000-000000002ac1', '00000000-0000-0000-0000-000000002ac3',
              '00000000-0000-0000-0000-000000002ac4', '00000000-0000-0000-0000-000000002a99']::uuid[], 50, 30)$$,
  $$VALUES (2, 0, 1, 1, 1)$$,
  'pone en cola a A y a B una vez cada una; deja fuera a la de baja, a la avisada hace 10 días y al id que no es de nadie');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_inactive_reminders
    WHERE client_id IN ('00000000-0000-0000-0000-000000002ac1', '00000000-0000-0000-0000-000000002ac2')
      AND status = 'pending' AND queued_by = '00000000-0000-0000-0000-000000002aa9'),
  2, 'una fila en cola por clienta, con quién la puso');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_inactive_subscriptions
    WHERE client_id IN ('00000000-0000-0000-0000-000000002ac1', '00000000-0000-0000-0000-000000002ac2')
      AND opted_out_at IS NULL),
  2, 'poner en cola crea la suscripción con su token la primera vez');

SELECT results_eq(
  $$SELECT queued, already_queued FROM public.notifications_queue_inactive_reminders(
      ARRAY['00000000-0000-0000-0000-000000002ac1']::uuid[], 50, 30)$$,
  $$VALUES (0, 1)$$,
  'volver a poner en cola a quien ya está en cola no duplica (criterio 2, envío individual)');

SELECT results_eq(
  $$SELECT queued, recent FROM public.notifications_queue_inactive_reminders(
      ARRAY['00000000-0000-0000-0000-000000002ac4']::uuid[], 50, 0)$$,
  $$VALUES (1, 0)$$,
  'sin días mínimos entre recordatorios, la avisada hace 10 días sí entra');

SELECT throws_ok(
  $$SELECT * FROM public.notifications_queue_inactive_reminders(
      ARRAY['00000000-0000-0000-0000-000000002ac1', '00000000-0000-0000-0000-000000002ac2']::uuid[], 1, 30)$$,
  '22023', 'notifications_inactive_too_many', 'más clientas que el tope por envío se rechaza entero');

SELECT throws_ok(
  $$SELECT * FROM public.notifications_queue_inactive_reminders(ARRAY[]::uuid[], 50, 30)$$,
  '22023', 'notifications_inactive_no_clients', 'una lista vacía se rechaza');

SELECT throws_ok(
  $$SELECT * FROM public.notifications_queue_inactive_reminders(NULL, 50, 30)$$,
  '22023', 'notifications_inactive_no_clients', 'una lista nula se rechaza');

SELECT is(
  (SELECT (payload ->> 'queued')::int FROM public.audit_events
    WHERE action = 'notifications.inactive_reminders.queued'
      AND actor_id = '00000000-0000-0000-0000-000000002aa9'
    ORDER BY created_at, (payload ->> 'queued')::int DESC LIMIT 1),
  2, 'deja el evento en la bitácora con cuántas puso en cola');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000002aa1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.notifications_queue_inactive_reminders(
      ARRAY['00000000-0000-0000-0000-000000002ac2']::uuid[], 50, 30)$$,
  '42501', 'notifications_not_admin', 'una clienta no pone recordatorios en cola');

-- ── Darse de baja y volver a suscribirse ───────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.notifications_queue_inactive_reminders(
      ARRAY['00000000-0000-0000-0000-000000002ac2']::uuid[], 50, 30)$$,
  '42501', NULL, 'un anónimo no pone recordatorios en cola');

SELECT lives_ok(
  $$SELECT public.notifications_unsubscribe_inactive('00000000-0000-0000-0000-000000002af4')$$,
  'la clienta se da de baja desde el enlace, sin iniciar sesión');

RESET ROLE;
SELECT ok(
  (SELECT opted_out_at IS NOT NULL FROM public.notifications_inactive_subscriptions
    WHERE client_id = '00000000-0000-0000-0000-000000002ac4'),
  'la baja queda guardada con su fecha');

CREATE TEMP TABLE first_optout AS
  SELECT opted_out_at FROM public.notifications_inactive_subscriptions
   WHERE client_id = '00000000-0000-0000-0000-000000002ac4';

SET LOCAL ROLE anon;
SELECT lives_ok(
  $$SELECT public.notifications_unsubscribe_inactive('00000000-0000-0000-0000-000000002af4')$$,
  'darse de baja dos veces no falla');

RESET ROLE;
SELECT is(
  (SELECT opted_out_at FROM public.notifications_inactive_subscriptions
    WHERE client_id = '00000000-0000-0000-0000-000000002ac4'),
  (SELECT opted_out_at FROM first_optout),
  'la segunda baja conserva la fecha de la primera');

SET LOCAL ROLE anon;
SELECT lives_ok(
  $$SELECT public.notifications_unsubscribe_inactive('00000000-0000-0000-0000-000000002a00')$$,
  'un token que no existe responde igual, sin error que delate qué tokens existen');

SELECT lives_ok(
  $$SELECT public.notifications_resubscribe_inactive('00000000-0000-0000-0000-000000002af3')$$,
  'la clienta vuelve a suscribirse desde el mismo enlace (decisión del PO)');

RESET ROLE;
SELECT is(
  (SELECT opted_out_at FROM public.notifications_inactive_subscriptions
    WHERE client_id = '00000000-0000-0000-0000-000000002ac3'),
  NULL::timestamptz, 'al volver a suscribirse se borra la baja');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000002aa9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT queued, opted_out FROM public.notifications_queue_inactive_reminders(
      ARRAY['00000000-0000-0000-0000-000000002ac3']::uuid[], 50, 30)$$,
  $$VALUES (1, 0)$$,
  'suscrita de nuevo, vuelve a recibir recordatorios');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM pg_proc
    WHERE proname IN ('notifications_queue_inactive_reminders', 'notifications_unsubscribe_inactive',
                      'notifications_resubscribe_inactive')
      AND prosecdef AND proconfig @> ARRAY['search_path=public, pg_temp']),
  3, 'las tres son SECURITY DEFINER con search_path fijo');

SELECT ok(
  NOT has_function_privilege('anon', 'public.notifications_queue_inactive_reminders(uuid[], integer, integer)', 'EXECUTE'),
  'anon no tiene EXECUTE sobre poner en cola');

SELECT ok(
  has_function_privilege('anon', 'public.notifications_unsubscribe_inactive(uuid)', 'EXECUTE')
  AND has_function_privilege('anon', 'public.notifications_resubscribe_inactive(uuid)', 'EXECUTE'),
  'anon sí ejecuta la baja y volver a suscribirse: la clienta llega sin sesión');

SELECT * FROM finish();
ROLLBACK;
