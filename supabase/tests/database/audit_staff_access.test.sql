-- audit_staff_access.test.sql
-- US-AGE-13 · feature audit — control positivo de acceso de staff (SEC-001) y la garantía de
-- append-only: ni siquiera staff puede UPDATE/DELETE en audit_events.
--
-- Complementa src/features/audit/__tests__/rls-isolation.test.ts (SEC-002), que solo prueba el
-- control negativo (anon y clienta no leen ni escriben). Aquí se demuestra que una sesión con
-- rol admin o superadmin SÍ puede INSERT y SELECT, que una clienta sigue sin poder ninguna de
-- las dos, y que NADIE — ni siquiera admin — puede UPDATE o DELETE. El rol se siembra como
-- superusuario local dentro de la transacción; no se usa la service-role key (SEC-003) y todo
-- se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(12);

-- Dos usuarias: la disparadora de handle_new_auth_user() les da rol 'cliente'.
INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'audit-staff-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'audit-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000b1';

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), true, 'admin: auth_is_staff() es true');

SELECT lives_ok(
  $$INSERT INTO public.audit_events (id, actor_id, action, entity_type, entity_id, payload)
    VALUES ('00000000-0000-0000-0000-00000000e001',
            '00000000-0000-0000-0000-0000000000b1',
            'payments.deposit_exemption.granted',
            'clients_profile',
            '00000000-0000-0000-0000-0000000000c9',
            '{"reason":"prueba"}'::jsonb)$$,
  'admin: INSERT permitido');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE id = '00000000-0000-0000-0000-00000000e001'),
  1, 'admin: la fila insertada existe');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE id = '00000000-0000-0000-0000-00000000e001'),
  1, 'admin: SELECT ve la fila que insertó');

SELECT throws_ok(
  $$UPDATE public.audit_events SET action = 'alterado'
     WHERE id = '00000000-0000-0000-0000-00000000e001'$$,
  '42501', NULL, 'admin: UPDATE denegado — append-only, sin excepción de rol');

SELECT throws_ok(
  $$DELETE FROM public.audit_events
     WHERE id = '00000000-0000-0000-0000-00000000e001'$$,
  '42501', NULL, 'admin: DELETE denegado — append-only, sin excepción de rol');

SELECT is(
  (SELECT action FROM public.audit_events
    WHERE id = '00000000-0000-0000-0000-00000000e001'),
  'payments.deposit_exemption.granted', 'admin: la fila sigue intacta tras los intentos');

-- ── Como clienta (contraste: la misma tabla, sin rol de staff) ──────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), false, 'clienta: auth_is_staff() es false');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events),
  0, 'clienta: SELECT no ve ninguna fila (ni la que insertó admin)');

SELECT throws_ok(
  $$INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id)
    VALUES ('00000000-0000-0000-0000-0000000000b2', 'rls.probe', 'rls_probe',
            '00000000-0000-0000-0000-0000000000c9')$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

SELECT throws_ok(
  $$UPDATE public.audit_events SET action = 'alterado'
     WHERE id = '00000000-0000-0000-0000-00000000e001'$$,
  '42501', NULL, 'clienta: UPDATE denegado');

SELECT throws_ok(
  $$DELETE FROM public.audit_events
     WHERE id = '00000000-0000-0000-0000-00000000e001'$$,
  '42501', NULL, 'clienta: DELETE denegado');

SELECT * FROM finish();
ROLLBACK;
