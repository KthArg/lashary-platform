-- catalog_staff_write.test.sql
-- US-AGE-08 · feature catalog — control positivo de escritura de staff (SEC-001).
--
-- Complementa src/features/catalog/__tests__/rls-isolation.test.ts (SEC-002), que solo prueba el control
-- negativo (anon y clienta no escriben). Aquí se demuestra que una sesión con rol admin o
-- superadmin SÍ puede INSERT / UPDATE / DELETE en catalog_techniques, y que una clienta sigue
-- sin poder. El rol se siembra como superusuario local dentro de la transacción; no se usa la
-- service-role key (SEC-003) y todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

-- Tres usuarias: la disparadora de handle_new_auth_user() les da rol 'cliente'.
INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'staff-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'staff-superadmin@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a1';
UPDATE public.auth_user_roles SET role = 'superadmin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a2';

-- Técnica sembrada por el superusuario para probar UPDATE / DELETE.
INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
VALUES
  ('00000000-0000-0000-0000-00000000f001', 'zz-test tecnica base', 'lash_classic',
   20000, 90, 5000, 'cuidados de prueba');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), true, 'admin: auth_is_staff() es true');

SELECT lives_ok(
  $$INSERT INTO public.catalog_techniques
      (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'zz-test tecnica admin', 'henna',
            18000, 60, 4000, 'cuidados')$$,
  'admin: INSERT permitido');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_techniques WHERE name = 'zz-test tecnica admin'),
  1, 'admin: la fila insertada existe');

UPDATE public.catalog_techniques SET price_first_time = 22000
 WHERE id = '00000000-0000-0000-0000-00000000f001';
SELECT is(
  (SELECT price_first_time::int FROM public.catalog_techniques
    WHERE id = '00000000-0000-0000-0000-00000000f001'),
  22000, 'admin: UPDATE modifica la fila');

DELETE FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000f002';
SELECT is(
  (SELECT count(*)::int FROM public.catalog_techniques
    WHERE id = '00000000-0000-0000-0000-00000000f002'),
  0, 'admin: DELETE elimina la fila');

-- ── Como superadmin ─────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), true, 'superadmin: auth_is_staff() es true');

SELECT lives_ok(
  $$INSERT INTO public.catalog_techniques
      (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
    VALUES ('00000000-0000-0000-0000-00000000f003', 'zz-test tecnica superadmin', 'lips',
            15000, 45, 3000, 'cuidados')$$,
  'superadmin: INSERT permitido');

UPDATE public.catalog_techniques SET is_active = false
 WHERE id = '00000000-0000-0000-0000-00000000f003';
SELECT is(
  (SELECT is_active FROM public.catalog_techniques
    WHERE id = '00000000-0000-0000-0000-00000000f003'),
  false, 'superadmin: UPDATE modifica la fila');

DELETE FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000f003';
SELECT is(
  (SELECT count(*)::int FROM public.catalog_techniques
    WHERE id = '00000000-0000-0000-0000-00000000f003'),
  0, 'superadmin: DELETE elimina la fila');

-- ── Como clienta (contraste: la misma sesión sin rol de staff no puede) ─────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), false, 'clienta: auth_is_staff() es false');

SELECT throws_ok(
  $$INSERT INTO public.catalog_techniques
      (name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
    VALUES ('zz-test clienta', 'henna', 1000, 30, 0, 'x')$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

UPDATE public.catalog_techniques SET price_first_time = 1
 WHERE id = '00000000-0000-0000-0000-00000000f001';
SELECT is(
  (SELECT price_first_time::int FROM public.catalog_techniques
    WHERE id = '00000000-0000-0000-0000-00000000f001'),
  22000, 'clienta: UPDATE no altera la fila');

DELETE FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000f001';
SELECT is(
  (SELECT count(*)::int FROM public.catalog_techniques
    WHERE id = '00000000-0000-0000-0000-00000000f001'),
  1, 'clienta: DELETE no elimina la fila');

SELECT * FROM finish();
ROLLBACK;
