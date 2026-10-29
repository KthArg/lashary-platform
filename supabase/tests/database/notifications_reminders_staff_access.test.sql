-- notifications_reminders_staff_access.test.sql
-- US-NOT-03 · feature notifications — control positivo (staff) y negativo (clienta, anon) de
-- notifications_reminders (SEC-001, SEC-002). Nadie salvo staff lee o escribe esta tabla: ni la
-- clienta a la que pertenece la cita, ni una sesión anónima.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'staff-admin-not03@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'clienta-not03@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a1';

-- Fila sembrada por el superusuario para probar SELECT/UPDATE desde cada rol.
INSERT INTO public.notifications_reminders
  (id, appointment_id, client_id, starts_at, technique_name, send_at)
VALUES
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000a001',
   '00000000-0000-0000-0000-0000000000c1', now() + interval '2 days', 'zz-test tecnica',
   now() + interval '1 day');

-- ── Como staff (admin) ──────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reminders WHERE id = '00000000-0000-0000-0000-00000000f001'),
  1, 'staff: SELECT ve la fila');

SELECT lives_ok(
  $$INSERT INTO public.notifications_reminders
      (id, appointment_id, client_id, starts_at, technique_name, send_at)
    VALUES ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000a002',
            '00000000-0000-0000-0000-0000000000c1', now() + interval '3 days', 'zz-test tecnica 2',
            now() + interval '2 days')$$,
  'staff: INSERT permitido');

UPDATE public.notifications_reminders SET status = 'sent', sent_at = now(), last_channel = 'whatsapp'
 WHERE id = '00000000-0000-0000-0000-00000000f001';
SELECT is(
  (SELECT status FROM public.notifications_reminders WHERE id = '00000000-0000-0000-0000-00000000f001'),
  'sent', 'staff: UPDATE modifica la fila');

SELECT lives_ok(
  $$SELECT * FROM public.notifications_claim_due_reminders(now(), 10)$$,
  'staff: EXECUTE de notifications_claim_due_reminders permitido');
SELECT lives_ok(
  $$SELECT * FROM public.notifications_release_expired_claims(now(), 10)$$,
  'staff: EXECUTE de notifications_release_expired_claims permitido');

-- ── Como clienta (contraste: es su propia cita y aun así no entra) ──────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reminders WHERE id = '00000000-0000-0000-0000-00000000f001'),
  0, 'clienta: SELECT no ve ninguna fila');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminders
      (appointment_id, client_id, starts_at, technique_name, send_at)
    VALUES ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-0000000000c1',
            now() + interval '4 days', 'zz-test clienta', now() + interval '3 days')$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

-- El EXECUTE en sí lo tiene cualquier authenticated (SEC-001: la RLS es la frontera real, no un
-- rol de SQL aparte); como clienta, el UPDATE de adentro no lanza 42501 (eso solo pasa con el
-- WITH CHECK de un INSERT) — la RLS simplemente no le deja ver ni afectar ninguna fila.
SELECT is(
  (SELECT count(*)::int FROM public.notifications_claim_due_reminders(now(), 10)),
  0, 'clienta: notifications_claim_due_reminders no reclama nada (RLS)');
SELECT is(
  (SELECT count(*)::int FROM public.notifications_release_expired_claims(now(), 10)),
  0, 'clienta: notifications_release_expired_claims no libera nada (RLS)');

-- Sin política de SELECT para la clienta, la fila es invisible para ella: UPDATE y DELETE no
-- lanzan 42501 (eso solo pasa con el WITH CHECK de un INSERT), simplemente no afectan ninguna
-- fila porque RLS la filtra antes. La prueba real está más abajo, leída de vuelta como staff.
UPDATE public.notifications_reminders SET status = 'cancelled'
 WHERE id = '00000000-0000-0000-0000-00000000f001';
DELETE FROM public.notifications_reminders WHERE id = '00000000-0000-0000-0000-00000000f001';

-- ── Como anon ────────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reminders),
  0, 'anon: SELECT no ve ninguna fila');

SELECT throws_ok(
  $$INSERT INTO public.notifications_reminders
      (appointment_id, client_id, starts_at, technique_name, send_at)
    VALUES ('00000000-0000-0000-0000-00000000a004', '00000000-0000-0000-0000-0000000000c1',
            now() + interval '5 days', 'zz-test anon', now() + interval '4 days')$$,
  NULL, NULL, 'anon: INSERT denegado por RLS');

-- ── De vuelta como staff: confirma que nada de lo anterior se filtró ────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reminders),
  2, 'staff: solo existen las dos filas sembradas por staff');

SELECT is(
  (SELECT status FROM public.notifications_reminders WHERE id = '00000000-0000-0000-0000-00000000f001'),
  'sent', 'staff: el intento de la clienta no cambió el estado');

SELECT * FROM finish();
ROLLBACK;
