-- scheduling_rls.test.sql
-- US-AGE-01 · feature scheduling — RLS de scheduling_weekly_availability, scheduling_closed_dates
-- y scheduling_manual_blocks (SEC-001, SEC-002).
--
-- Lectura pública (el calendario público de US-AGE-02 la necesita sin sesión); escritura solo
-- admin/superadmin vía public.auth_is_admin(). Se prueba con anon, una clienta, un admin y un
-- superadmin reales; también los CHECK y el UNIQUE de las tablas. El rol se siembra como
-- superusuario local dentro de la transacción; no se usa la service-role key (SEC-003) y todo
-- se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(21);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'sched-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'sched-superadmin@test.local'),
  ('00000000-0000-0000-0000-0000000000d1', 'sched-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000b1';
UPDATE public.auth_user_roles SET role = 'superadmin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000b2';

-- Una fila por tabla, sembrada por el superusuario, para probar lectura y UPDATE.
INSERT INTO public.scheduling_weekly_availability (id, resource_id, day_of_week, start_time, end_time)
VALUES ('00000000-0000-0000-0000-00000000e001',
        (SELECT id FROM public.scheduling_resources LIMIT 1), 1, '09:00', '17:00');
INSERT INTO public.scheduling_closed_dates (id, resource_id, closed_date, reason)
VALUES ('00000000-0000-0000-0000-00000000e002',
        (SELECT id FROM public.scheduling_resources LIMIT 1), '2026-12-25', 'Navidad');
INSERT INTO public.scheduling_manual_blocks (id, resource_id, starts_at, ends_at)
VALUES ('00000000-0000-0000-0000-00000000e003',
        (SELECT id FROM public.scheduling_resources LIMIT 1),
        '2026-10-01T20:00:00Z', '2026-10-01T21:00:00Z');

-- ── Como anon: lee todo, no escribe nada ────────────────────────────────────
SET LOCAL ROLE anon;

SELECT is((SELECT count(*)::int FROM public.scheduling_resources), 1,
  'anon: lee scheduling_resources (recurso sembrado)');
SELECT is((SELECT count(*)::int FROM public.scheduling_weekly_availability), 1,
  'anon: lee scheduling_weekly_availability');
SELECT is((SELECT count(*)::int FROM public.scheduling_closed_dates), 1,
  'anon: lee scheduling_closed_dates');
SELECT is((SELECT count(*)::int FROM public.scheduling_manual_blocks), 1,
  'anon: lee scheduling_manual_blocks');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, day_of_week, start_time, end_time)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), 2, '09:00', '12:00')$$,
  '42501', NULL, 'anon: INSERT en scheduling_weekly_availability denegado');
SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_date)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), '2026-12-31')$$,
  '42501', NULL, 'anon: INSERT en scheduling_closed_dates denegado');
SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1),
            '2026-11-01T14:00:00Z', '2026-11-01T15:00:00Z')$$,
  '42501', NULL, 'anon: INSERT en scheduling_manual_blocks denegado');

RESET ROLE;

-- ── Como clienta: misma lectura, sin escritura ──────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

SELECT is(public.auth_is_admin(), false, 'clienta: auth_is_admin() es false');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, day_of_week, start_time, end_time)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), 2, '09:00', '12:00')$$,
  '42501', NULL, 'clienta: INSERT en scheduling_weekly_availability denegado');
SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_date)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), '2026-12-31')$$,
  '42501', NULL, 'clienta: INSERT en scheduling_closed_dates denegado');
SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1),
            '2026-11-01T14:00:00Z', '2026-11-01T15:00:00Z')$$,
  '42501', NULL, 'clienta: INSERT en scheduling_manual_blocks denegado');

UPDATE public.scheduling_weekly_availability SET end_time = '10:00'
 WHERE id = '00000000-0000-0000-0000-00000000e001';
SELECT is(
  (SELECT end_time::text FROM public.scheduling_weekly_availability
    WHERE id = '00000000-0000-0000-0000-00000000e001'),
  '17:00:00', 'clienta: UPDATE no altera scheduling_weekly_availability');

-- ── Como admin: escribe; los CHECK y el UNIQUE siguen aplicando ─────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

SELECT is(public.auth_is_admin(), true, 'admin: auth_is_admin() es true');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, day_of_week, start_time, end_time)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), 2, '09:00', '12:00')$$,
  'admin: INSERT en scheduling_weekly_availability permitido');
SELECT lives_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_date)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), '2026-12-31')$$,
  'admin: INSERT en scheduling_closed_dates permitido');
SELECT lives_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1),
            '2026-11-01T14:00:00Z', '2026-11-01T15:00:00Z')$$,
  'admin: INSERT en scheduling_manual_blocks permitido');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, day_of_week, start_time, end_time)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), 3, '17:00', '09:00')$$,
  '23514', NULL, 'admin: CHECK end_time > start_time rechaza un rango invertido');
SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1),
            '2026-11-02T15:00:00Z', '2026-11-02T14:00:00Z')$$,
  '23514', NULL, 'admin: CHECK ends_at > starts_at rechaza un rango invertido');
SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_date)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), '2026-12-31')$$,
  '23505', NULL, 'admin: UNIQUE (resource_id, closed_date) rechaza una fecha repetida');

-- ── Como superadmin ─────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

SELECT is(public.auth_is_admin(), true, 'superadmin: auth_is_admin() es true');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, day_of_week, start_time, end_time)
    VALUES ((SELECT id FROM public.scheduling_resources LIMIT 1), 3, '09:00', '12:00')$$,
  'superadmin: INSERT en scheduling_weekly_availability permitido');

SELECT * FROM finish();
ROLLBACK;
