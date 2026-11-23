-- notifications_inactive_tables.test.sql
-- US-NOT-06 · notifications — el registro de recordatorios a clientas inactivas y la suscripción de cada
-- clienta (con su token de baja). Cada estado exige sus campos, una sola fila en cola por clienta, el token es
-- aleatorio y único, solo el personal lee (SEC-001), ninguna clienta ve las filas de nadie, ni las suyas, y
-- nadie con sesión escribe directo salvo el resultado del envío (SEC-002). Las filas se escriben como dueño
-- de la tabla; todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-00000000028a', 'inactivas-clienta@test.local'),
  ('00000000-0000-0000-0000-00000000028b', 'inactivas-otra@test.local'),
  ('00000000-0000-0000-0000-00000000028f', 'inactivas-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-00000000028f';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000028c1', '00000000-0000-0000-0000-00000000028a', 'Inactiva A',
   'inactivas-clienta@test.local', '+50688882801'),
  ('00000000-0000-0000-0000-0000000028c2', '00000000-0000-0000-0000-00000000028b', 'Inactiva B',
   'inactivas-otra@test.local', '+50688882802');

INSERT INTO public.notifications_inactive_reminders (id, client_id, queued_by)
VALUES ('00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-0000000028c1',
        '00000000-0000-0000-0000-00000000028f');

INSERT INTO public.notifications_inactive_subscriptions (client_id)
VALUES ('00000000-0000-0000-0000-0000000028c1'), ('00000000-0000-0000-0000-0000000028c2');

-- ── La forma del registro ──────────────────────────────────────────────────────
SELECT is(
  (SELECT status || '|' || attempts FROM public.notifications_inactive_reminders
    WHERE id = '00000000-0000-0000-0000-0000000028d1'),
  'pending|0', 'un recordatorio nace en cola y sin intentos');

SELECT throws_ok(
  $$INSERT INTO public.notifications_inactive_reminders (client_id, queued_by)
    VALUES ('00000000-0000-0000-0000-0000000028c1', '00000000-0000-0000-0000-00000000028f')$$,
  '23505', NULL, 'una clienta no tiene dos recordatorios en cola a la vez');

SELECT throws_ok(
  $$UPDATE public.notifications_inactive_reminders SET status = 'sent'
     WHERE id = '00000000-0000-0000-0000-0000000028d1'$$,
  '23514', NULL, 'enviado sin fecha ni canal se rechaza');

SELECT lives_ok(
  $$UPDATE public.notifications_inactive_reminders
       SET status = 'sent', sent_at = now(), last_channel = 'email', attempts = 1
     WHERE id = '00000000-0000-0000-0000-0000000028d1'$$,
  'enviado lleva la fecha y el canal (criterio 3)');

SELECT lives_ok(
  $$INSERT INTO public.notifications_inactive_reminders (client_id, queued_by)
    VALUES ('00000000-0000-0000-0000-0000000028c1', '00000000-0000-0000-0000-00000000028f')$$,
  'enviado el anterior, la clienta puede tener otro recordatorio en cola');

SELECT throws_ok(
  $$INSERT INTO public.notifications_inactive_reminders (client_id, queued_by, status)
    VALUES ('00000000-0000-0000-0000-0000000028c2', '00000000-0000-0000-0000-00000000028f', 'enviado')$$,
  '23514', NULL, 'un estado fuera de la lista se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.notifications_inactive_reminders (client_id, queued_by, last_error)
    VALUES ('00000000-0000-0000-0000-0000000028c2', '00000000-0000-0000-0000-00000000028f', repeat('x', 502))$$,
  '23514', NULL, 'el error del proveedor va acotado, como en la bitácora de intentos');

-- ── La suscripción ─────────────────────────────────────────────────────────────
SELECT is(
  (SELECT count(DISTINCT token)::int FROM public.notifications_inactive_subscriptions
    WHERE client_id IN ('00000000-0000-0000-0000-0000000028c1', '00000000-0000-0000-0000-0000000028c2')),
  2, 'cada clienta tiene su propio token aleatorio');

SELECT is(
  (SELECT opted_out_at FROM public.notifications_inactive_subscriptions
    WHERE client_id = '00000000-0000-0000-0000-0000000028c1'),
  NULL::timestamptz, 'una clienta nace suscrita');

SELECT throws_ok(
  $$INSERT INTO public.notifications_inactive_subscriptions (client_id)
    VALUES ('00000000-0000-0000-0000-0000000028c1')$$,
  '23505', NULL, 'una sola suscripción por clienta');

-- ── El personal lee; ninguna clienta ve nada ───────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000028f","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_inactive_reminders
    WHERE client_id = '00000000-0000-0000-0000-0000000028c1'),
  2, 'la administradora lee el registro de envíos');

SELECT throws_ok(
  $$INSERT INTO public.notifications_inactive_reminders (client_id, queued_by)
    VALUES ('00000000-0000-0000-0000-0000000028c2', '00000000-0000-0000-0000-00000000028f')$$,
  '42501', NULL, 'ni la administradora pone un recordatorio en cola escribiendo la tabla directo');

SELECT throws_ok(
  $$UPDATE public.notifications_inactive_subscriptions SET opted_out_at = now()
     WHERE client_id = '00000000-0000-0000-0000-0000000028c2'$$,
  '42501', NULL, 'ni la administradora da de baja a una clienta escribiendo la tabla directo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000028a","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_inactive_reminders),
  0, 'una clienta no ve ningún recordatorio, ni los suyos');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_inactive_subscriptions),
  0, 'una clienta no ve ninguna suscripción ni token, ni el suyo');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT count(*) FROM public.notifications_inactive_reminders$$, '42501', NULL,
  'un anónimo no lee el registro');

SELECT throws_ok($$SELECT count(*) FROM public.notifications_inactive_subscriptions$$, '42501', NULL,
  'un anónimo no lee las suscripciones: la baja pasa por la función con el token');

SELECT * FROM finish();
ROLLBACK;
