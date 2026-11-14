-- notifications_reapplication_reminders.test.sql
-- US-NOT-05 · feature notifications — control positivo (staff) y negativo (clienta, anon) de
-- notifications_reapplication_reminders (SEC-001, SEC-002), más las dos reglas propias de la
-- tabla: un aviso por ciclo (UNIQUE) y sent_at solo cuando el estado es 'sent' (CHECK).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000a5', 'staff-admin-not05@test.local'),
  ('00000000-0000-0000-0000-0000000000c5', 'clienta-not05@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a5';

-- Fila sembrada por el superusuario para probar SELECT/UPDATE desde cada rol.
INSERT INTO public.notifications_reapplication_reminders
  (id, client_id, technique_id, technique_name, last_completed_at, due_at, status, sent_at, last_channel)
VALUES
  ('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-0000000000c5',
   '00000000-0000-0000-0000-00000000e101', 'zz-test tecnica', '2026-09-01 17:00:00+00',
   '2026-10-01 17:00:00+00', 'sent', now(), 'whatsapp');

-- ── Como staff (admin) ──────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reapplication_reminders WHERE id = '00000000-0000-0000-0000-00000000f101'),
  1, 'staff: SELECT ve la fila');

SELECT lives_ok(
  $$INSERT INTO public.notifications_reapplication_reminders
      (id, client_id, technique_id, technique_name, last_completed_at, due_at, status)
    VALUES ('00000000-0000-0000-0000-00000000f102', '00000000-0000-0000-0000-0000000000c5',
            '00000000-0000-0000-0000-00000000e102', 'zz-test tecnica 2', '2026-09-05 17:00:00+00',
            '2026-10-05 17:00:00+00', 'failed')$$,
  'staff: INSERT permitido (sin sent_at para un intento fallido)');

UPDATE public.notifications_reapplication_reminders SET status = 'sent', sent_at = now(), attempts = 2
 WHERE id = '00000000-0000-0000-0000-00000000f102';
SELECT is(
  (SELECT status FROM public.notifications_reapplication_reminders WHERE id = '00000000-0000-0000-0000-00000000f102'),
  'sent', 'staff: UPDATE modifica la fila (reintento exitoso en una corrida siguiente)');

SELECT throws_like(
  $$INSERT INTO public.notifications_reapplication_reminders
      (client_id, technique_id, technique_name, last_completed_at, due_at, status, sent_at)
    VALUES ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-00000000e101',
            'zz-test duplicado', '2026-09-01 17:00:00+00', '2026-10-01 17:00:00+00', 'sent', now())$$,
  '%notifications_reapplication_reminders_one_per_cycle%',
  'un segundo aviso para la misma clienta, técnica y última cita completada viola el ciclo único');

SELECT throws_like(
  $$INSERT INTO public.notifications_reapplication_reminders
      (client_id, technique_id, technique_name, last_completed_at, due_at, status, sent_at)
    VALUES ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-00000000e103',
            'zz-test sin enviar', '2026-09-10 17:00:00+00', '2026-10-10 17:00:00+00', 'failed', now())$$,
  '%notifications_reapplication_reminders_sent_at_matches_status%',
  'un intento fallido no puede llevar sent_at (el CHECK exige que coincidan)');

SELECT throws_like(
  $$INSERT INTO public.notifications_reapplication_reminders
      (client_id, technique_id, technique_name, last_completed_at, due_at, status)
    VALUES ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-00000000e104',
            'zz-test sin sent_at', '2026-09-15 17:00:00+00', '2026-10-15 17:00:00+00', 'sent')$$,
  '%notifications_reapplication_reminders_sent_at_matches_status%',
  'un aviso enviado sin sent_at tampoco pasa el CHECK');

-- ── Como clienta (contraste: es su propio aviso y aun así no entra) ─────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reapplication_reminders WHERE id = '00000000-0000-0000-0000-00000000f101'),
  0, 'clienta: SELECT no ve ninguna fila');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reapplication_reminders
      (client_id, technique_id, technique_name, last_completed_at, due_at, status)
    VALUES ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-00000000e105',
            'zz-test clienta', '2026-09-20 17:00:00+00', '2026-10-20 17:00:00+00', 'failed')$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

-- Sin política de SELECT para la clienta, la fila es invisible para ella: UPDATE y DELETE no
-- lanzan 42501, simplemente no afectan ninguna fila porque RLS la filtra antes. La prueba real
-- está más abajo, leída de vuelta como staff.
UPDATE public.notifications_reapplication_reminders SET status = 'failed'
 WHERE id = '00000000-0000-0000-0000-00000000f101';
DELETE FROM public.notifications_reapplication_reminders WHERE id = '00000000-0000-0000-0000-00000000f101';

-- ── Como anon ────────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reapplication_reminders),
  0, 'anon: SELECT no ve ninguna fila');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reapplication_reminders
      (client_id, technique_id, technique_name, last_completed_at, due_at, status)
    VALUES ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-00000000e106',
            'zz-test anon', '2026-09-25 17:00:00+00', '2026-10-25 17:00:00+00', 'failed')$$,
  NULL, NULL, 'anon: INSERT denegado por RLS');

-- ── De vuelta como staff: confirma que nada de lo anterior se filtró ────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reapplication_reminders),
  2, 'staff: solo existen las dos filas sembradas por staff');

SELECT is(
  (SELECT status FROM public.notifications_reapplication_reminders WHERE id = '00000000-0000-0000-0000-00000000f101'),
  'sent', 'staff: el intento de la clienta no cambió el estado');

SELECT * FROM finish();
ROLLBACK;
