-- catalog_promotion_staff_write.test.sql
-- US-PROM-01 · feature catalog — control positivo de escritura de staff (SEC-001).
--
-- Complementa src/features/catalog/__tests__/promotion-rls-isolation.test.ts (SEC-002), que
-- solo prueba el control negativo (anon y clienta no escriben). Aquí se demuestra que una
-- sesión con rol admin SÍ puede INSERT / UPDATE / DELETE en catalog_promotions, y que una
-- clienta sigue sin poder. Todo se deshace con ROLLBACK (sin service-role key, SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'promos-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'promos-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000e1';

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
VALUES
  ('00000000-0000-0000-0000-00000000e101', 'zz-test promo tecnica', 'lash_classic', 20000, 90, 5000, 'cuidados');

INSERT INTO public.catalog_packages (id, name, price, is_active)
VALUES ('00000000-0000-0000-0000-00000000e102', 'zz-test promo paquete', 10000, true);

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), true, 'admin: auth_is_staff() es true');

SELECT lives_ok(
  $$INSERT INTO public.catalog_promotions
      (id, technique_id, discount_percent, starts_at, ends_at)
    VALUES ('00000000-0000-0000-0000-00000000e103', '00000000-0000-0000-0000-00000000e101',
            20, '2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z')$$,
  'admin: INSERT permitido');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000e103'),
  1, 'admin: la fila insertada existe');

UPDATE public.catalog_promotions SET discount_percent = 30
 WHERE id = '00000000-0000-0000-0000-00000000e103';
SELECT is(
  (SELECT discount_percent::int FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000e103'),
  30, 'admin: UPDATE modifica la fila');

SELECT throws_ok(
  $$INSERT INTO public.catalog_promotions
      (technique_id, package_id, discount_percent, starts_at, ends_at)
    VALUES (NULL, NULL, 10, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')$$,
  '23514', NULL, 'invariante: sin técnica ni paquete se rechaza (xor)');

SELECT throws_ok(
  $$INSERT INTO public.catalog_promotions
      (technique_id, package_id, discount_percent, starts_at, ends_at)
    VALUES ('00000000-0000-0000-0000-00000000e101', '00000000-0000-0000-0000-00000000e102', 10, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')$$,
  '23514', NULL, 'invariante: técnica y paquete a la vez se rechaza (xor)');

SELECT throws_ok(
  $$INSERT INTO public.catalog_promotions
      (technique_id, discount_percent, starts_at, ends_at)
    VALUES ('00000000-0000-0000-0000-00000000e101', 10, '2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z')$$,
  '23514', NULL, 'invariante: ends_at anterior a starts_at se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.catalog_promotions
      (technique_id, discount_percent, starts_at, ends_at)
    VALUES ('00000000-0000-0000-0000-00000000e101', 101, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')$$,
  '23514', NULL, 'invariante: descuento mayor a 100 se rechaza');

DELETE FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000e103';
SELECT is(
  (SELECT count(*)::int FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000e103'),
  0, 'admin: DELETE elimina la fila');

-- ── Como clienta (contraste: la misma sesión sin rol de staff no puede) ─────
INSERT INTO public.catalog_promotions
  (id, technique_id, discount_percent, starts_at, ends_at)
VALUES
  ('00000000-0000-0000-0000-00000000e104', '00000000-0000-0000-0000-00000000e101',
   15, '2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), false, 'clienta: auth_is_staff() es false');

SELECT throws_ok(
  $$INSERT INTO public.catalog_promotions
      (technique_id, discount_percent, starts_at, ends_at)
    VALUES ('00000000-0000-0000-0000-00000000e101', 10, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

UPDATE public.catalog_promotions SET discount_percent = 1
 WHERE id = '00000000-0000-0000-0000-00000000e104';
SELECT is(
  (SELECT discount_percent::int FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000e104'),
  15, 'clienta: UPDATE no altera la fila');

DELETE FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000e104';
SELECT is(
  (SELECT count(*)::int FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000e104'),
  1, 'clienta: DELETE no elimina la fila');

SELECT * FROM finish();
ROLLBACK;
