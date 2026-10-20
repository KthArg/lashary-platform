-- scheduling_weekly_availability.test.sql
-- US-AGE-01 · feature scheduling — control positivo de staff (SEC-001) sobre los bloques
-- semanales, y el no-solape garantizado en la base.
--
-- Complementa src/features/scheduling/__tests__/rls-isolation.test.ts (SEC-002), que prueba el
-- control negativo con tokens reales. El rol se siembra como superusuario local dentro de la
-- transacción; no se usa la service-role key (SEC-003) y todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000001a1', 'scheduling-admin@test.local'),
  ('00000000-0000-0000-0000-0000000001c1', 'scheduling-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000001a1';

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_resources),
  1, 'seed: existe exactamente un recurso (ADR-0005)');

-- Recurso propio de la prueba: los asserts no dependen de los bloques que ya tenga la base.
INSERT INTO public.scheduling_resources (id, name) VALUES ('00000000-0000-4000-8000-0000000001f1', 'zz-test recurso semanal');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000001a1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_resources
    WHERE id = '00000000-0000-4000-8000-0000000001f1'),
  1, 'admin: ve el recurso');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_weekly_availability (id, resource_id, weekday, start_min, end_min)
    VALUES ('00000000-0000-0000-0000-00000000b001',
            '00000000-0000-4000-8000-0000000001f1', 1, 540, 720)$$,
  'admin: INSERT de un bloque lunes 09:00–12:00');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
    VALUES ('00000000-0000-4000-8000-0000000001f1', 1, 720, 1020)$$,
  'admin: un bloque contiguo (12:00–17:00) no es solape');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
    VALUES ('00000000-0000-4000-8000-0000000001f1', 1, 600, 660)$$,
  '23P01', NULL, 'base: un bloque que se solapa el mismo día se rechaza');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
    VALUES ('00000000-0000-4000-8000-0000000001f1', 2, 600, 660)$$,
  'admin: el mismo horario en otro día no es solape');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
    VALUES ('00000000-0000-4000-8000-0000000001f1', 3, 700, 600)$$,
  '23514', NULL, 'base: inicio después del fin se rechaza');

DELETE FROM public.scheduling_weekly_availability
 WHERE id = '00000000-0000-0000-0000-00000000b001';
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_weekly_availability
    WHERE id = '00000000-0000-0000-0000-00000000b001'),
  0, 'admin: DELETE elimina el bloque');

-- ── Como clienta ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000001c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_weekly_availability),
  0, 'clienta: no ve ningún bloque');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
    VALUES ('00000000-0000-4000-8000-0000000001f1', 4, 600, 660)$$,
  '42501', NULL, 'clienta: INSERT rechazado por RLS');

DELETE FROM public.scheduling_weekly_availability;
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_weekly_availability
    WHERE resource_id = '00000000-0000-4000-8000-0000000001f1'),
  2, 'clienta: su DELETE no borró ningún bloque');

SELECT * FROM finish();
ROLLBACK;
