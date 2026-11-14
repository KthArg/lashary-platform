-- notifications_set_reapplication_anticipation_days.test.sql
-- US-NOT-05 · la administradora cambia la anticipación del aviso de re-aplicación (criterio 3,
-- DOM-012, SEC-001). Solo admin; de 1 a 30 días; cada cambio deja su evento con el valor anterior
-- y el nuevo; poner el mismo valor no deja evento; la clienta y anon no la llaman.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f3', 'reap-anticipation-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f4', 'reap-anticipation-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f3';

-- ── Como admin ─────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  public.notifications_set_reapplication_anticipation_days(14),
  14, 'la administradora cambia la anticipación y la función devuelve el valor que quedó');

SELECT is(
  (SELECT anticipation_days FROM public.notifications_reapplication_settings),
  14, 'la anticipación quedó en 14 días');

SELECT results_eq(
  $$SELECT actor_id, entity_type, payload FROM public.audit_events
     WHERE action = 'notifications.settings.reapplication_anticipation_days_changed'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000f3'::uuid, 'notifications_reapplication_settings'::text,
            '{"anticipationDays": 14, "previousAnticipationDays": 7}'::jsonb)$$,
  'el cambio deja su evento en la bitácora con quién, el valor anterior y el nuevo');

SELECT is(
  (SELECT entity_id FROM public.audit_events WHERE action = 'notifications.settings.reapplication_anticipation_days_changed'),
  (SELECT id FROM public.notifications_reapplication_settings),
  'el evento queda sobre la configuración');

SELECT is(
  public.notifications_set_reapplication_anticipation_days(14),
  14, 'poner el mismo valor devuelve el valor');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events WHERE action = 'notifications.settings.reapplication_anticipation_days_changed'),
  1, 'y no deja otro evento: no cambió nada');

SELECT lives_ok($$SELECT public.notifications_set_reapplication_anticipation_days(1)$$, 'la anticipación puede bajar a 1 día');
SELECT lives_ok($$SELECT public.notifications_set_reapplication_anticipation_days(30)$$, 'y subir a 30 días');

SELECT throws_ok(
  $$SELECT public.notifications_set_reapplication_anticipation_days(0)$$,
  '22023', 'notifications_invalid_anticipation_days', 'la anticipación no baja de 1 día');

SELECT throws_ok(
  $$SELECT public.notifications_set_reapplication_anticipation_days(31)$$,
  '22023', 'notifications_invalid_anticipation_days', 'la anticipación no pasa de 30 días');

-- ── Como la clienta ────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f4","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.notifications_set_reapplication_anticipation_days(21)$$,
  '42501', 'notifications_not_admin', 'la clienta no puede cambiar la anticipación');

-- ── Como anon ──────────────────────────────────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.notifications_set_reapplication_anticipation_days(21)$$,
  '42501', NULL, 'anon no tiene permiso para llamar la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
