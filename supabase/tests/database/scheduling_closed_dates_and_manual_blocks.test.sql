-- scheduling_closed_dates_and_manual_blocks.test.sql
-- US-AGE-01 · feature scheduling — control positivo de staff (SEC-001) sobre días cerrados y
-- bloqueos manuales, y las garantías de la base (un cierre por día, no-solape de bloqueos).
--
-- Complementa src/features/scheduling/__tests__/rls-isolation.test.ts (SEC-002). El rol se
-- siembra como superusuario local dentro de la transacción; no se usa la service-role key
-- (SEC-003) y todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(15);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000002a1', 'scheduling-closed-admin@test.local'),
  ('00000000-0000-0000-0000-0000000002c1', 'scheduling-closed-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000002a1';

-- Recurso propio de la prueba: los asserts no dependen de lo que ya tenga la base.
INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-4000-8000-0000000002f1', 'zz-test recurso cierres');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002a1","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO public.scheduling_closed_dates (id, resource_id, closed_on, kind, label)
    VALUES ('00000000-0000-0000-0000-00000000c001',
            '00000000-0000-4000-8000-0000000002f1', '2026-12-25', 'holiday', 'Navidad')$$,
  'admin: INSERT de un feriado');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-11-02', 'non_working')$$,
  'admin: INSERT de un día no laborable sin nombre');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-12-25', 'non_working')$$,
  '23505', NULL, 'base: el mismo día no se cierra dos veces');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-12-26', 'vacaciones')$$,
  '23514', NULL, 'base: kind fuera del vocabulario se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind, label)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-12-27', 'holiday', '   ')$$,
  '23514', NULL, 'base: un nombre en blanco se rechaza (va NULL o con texto)');

DELETE FROM public.scheduling_closed_dates WHERE id = '00000000-0000-0000-0000-00000000c001';
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_closed_dates
    WHERE id = '00000000-0000-0000-0000-00000000c001'),
  0, 'admin: DELETE elimina el día cerrado');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at, reason)
    VALUES ('00000000-0000-4000-8000-0000000002f1',
            '2026-10-20 15:00Z', '2026-10-20 17:00Z', 'cita médica')$$,
  'admin: INSERT de un bloqueo manual');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-10-20 17:00Z', '2026-10-20 18:00Z')$$,
  'admin: un bloqueo contiguo no es solape');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-10-20 16:00Z', '2026-10-20 16:30Z')$$,
  '23P01', NULL, 'base: un bloqueo que se solapa se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-10-21 18:00Z', '2026-10-21 17:00Z')$$,
  '23514', NULL, 'base: inicio después del fin se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at, reason)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-10-23 15:00Z', '2026-10-23 16:00Z', '')$$,
  '23514', NULL, 'base: un motivo vacío se rechaza (va NULL o con texto)');

-- ── Como clienta ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_closed_dates)
    + (SELECT count(*)::int FROM public.scheduling_manual_blocks),
  0, 'clienta: no ve días cerrados ni bloqueos');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-12-31', 'holiday')$$,
  '42501', NULL, 'clienta: INSERT de día cerrado rechazado por RLS');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000002f1', '2026-10-22 15:00Z', '2026-10-22 16:00Z')$$,
  '42501', NULL, 'clienta: INSERT de bloqueo rechazado por RLS');

DELETE FROM public.scheduling_closed_dates;
DELETE FROM public.scheduling_manual_blocks;
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_closed_dates
    WHERE resource_id = '00000000-0000-4000-8000-0000000002f1')
    + (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE resource_id = '00000000-0000-4000-8000-0000000002f1'),
  3, 'clienta: su DELETE no borró nada');

SELECT * FROM finish();
ROLLBACK;
