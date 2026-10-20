-- scheduling_manual_blocks_unblock.test.sql
-- US-AGE-07 · feature scheduling — staff desbloquea (criterio 3) y la clienta no; un bloqueo sobre
-- una cita activa se rechaza y, resuelta la cita, se acepta (criterio 4); lo bloqueado y lo
-- desbloqueado se ve en la siguiente lectura del calendario de la clienta (criterio 2). Una clienta
-- que intenta bloquear recibe siempre el rechazo de RLS, nunca el del trigger (SEC-001).
--
-- Complementa __tests__/availability-rls-isolation.test.ts (SEC-002). El rol se siembra como
-- superusuario local dentro de la transacción; no se usa la service-role key (SEC-003) y todo se
-- deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000007a1', 'scheduling-unblock-admin@test.local'),
  ('00000000-0000-0000-0000-0000000007c1', 'scheduling-unblock-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000007a1';

INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-4000-8000-0000000007f1', 'zz-test recurso bloqueos');

-- scheduling_busy_ranges(recurso, fecha) solo devuelve lo que cae en el horario abierto: el lunes
-- abre de 08:00 a 18:00 en Costa Rica (14:00Z a 00:00Z), así la grilla de 30 minutos empieza en
-- las 14:00Z.
INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-4000-8000-0000000007f1', 1, 480, 1080);

-- Cita pendiente de aprobación (ocupa espacio) de 11:00 a 12:15 (con limpieza) del lunes 2026-10-19 en Costa Rica (17:00Z).
INSERT INTO public.scheduling_appointments (id, resource_id, status, starts_at, ends_at, occupied_range)
VALUES ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000007f1', 'pending_approval',
        '2026-10-19 17:00Z', '2026-10-19 18:00Z', tstzrange('2026-10-19 17:00Z', '2026-10-19 18:15Z'));

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO public.scheduling_manual_blocks (id, resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000007b1', '00000000-0000-4000-8000-0000000007f1',
            '2026-10-19 15:00Z', '2026-10-19 16:00Z'),
           ('00000000-0000-4000-8000-0000000007b2', '00000000-0000-4000-8000-0000000007f1',
            '2026-10-19 20:00Z', '2026-10-19 20:30Z')$$,
  'admin: bloquea varios espacios libres en una sola sentencia');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000007f1', '2026-10-19 18:00Z', '2026-10-19 18:30Z')$$,
  '23514', 'scheduling_manual_blocks_active_appointment',
  'base: un bloqueo que se cruza con la limpieza de una cita activa se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000007f1', '2026-10-19 19:00Z', '2026-10-19 19:30Z'),
           ('00000000-0000-4000-8000-0000000007f1', '2026-10-19 17:30Z', '2026-10-19 18:00Z')$$,
  '23514', 'scheduling_manual_blocks_active_appointment',
  'base: si un espacio de la selección tiene cita, no se bloquea ninguno');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE resource_id = '00000000-0000-4000-8000-0000000007f1'),
  2, 'base: la selección rechazada no dejó bloqueos a medias');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000007f1', '2026-10-19 18:15Z', '2026-10-19 18:45Z')$$,
  'admin: un bloqueo que solo toca el final de la cita se acepta');

-- ── Como clienta ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007c1","role":"authenticated"}', true);

-- Un bloqueo que pisa la cita y uno que no la pisa fallan igual para ella: RLS lo rechaza antes
-- de que el trigger mire las citas, así no se puede leer dónde termina una cita ajena (SEC-001).
SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000007f1', '2026-10-19 18:14Z', '2026-10-19 18:30Z')$$,
  '42501', NULL,
  'clienta: bloquear sobre una cita choca con RLS, no con el trigger que revela la cita');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000007f1', '2026-10-19 21:00Z', '2026-10-19 21:30Z')$$,
  '42501', NULL,
  'clienta: bloquear un espacio libre también choca con RLS');

-- La cita (hasta las 18:15Z, que sube a 18:30Z) y el bloqueo pegado (hasta las 18:45Z, que sube a
-- 19:00Z) salen como un solo rango ocupado.
SELECT results_eq(
  $$SELECT starts_at, ends_at
      FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000007f1', '2026-10-19')$$,
  $$VALUES ('2026-10-19 15:00Z'::timestamptz, '2026-10-19 16:00Z'::timestamptz),
           ('2026-10-19 17:00Z'::timestamptz, '2026-10-19 19:00Z'::timestamptz),
           ('2026-10-19 20:00Z'::timestamptz, '2026-10-19 20:30Z'::timestamptz)$$,
  'clienta: ve ocupados los bloqueos y la cita (criterio 2)');

DELETE FROM public.scheduling_manual_blocks WHERE id = '00000000-0000-4000-8000-0000000007b1';
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE id = '00000000-0000-4000-8000-0000000007b1'),
  1, 'clienta: su DELETE no desbloquea nada (SEC-001)');

-- ── Admin desbloquea y resuelve la cita ─────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);

DELETE FROM public.scheduling_manual_blocks WHERE id = '00000000-0000-4000-8000-0000000007b1';
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE id = '00000000-0000-4000-8000-0000000007b1'),
  0, 'admin: desbloquea un espacio (criterio 3)');

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_decide_appointment('00000000-0000-4000-8000-0000000007e1', 'rejected', NULL)$$,
  'admin: resuelve la cita rechazándola');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000007f1', '2026-10-19 17:00Z', '2026-10-19 18:00Z')$$,
  'admin: con la cita resuelta, el espacio se puede bloquear (criterio 4)');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007c1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT starts_at, ends_at
      FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000007f1', '2026-10-19')$$,
  $$VALUES ('2026-10-19 17:00Z'::timestamptz, '2026-10-19 18:00Z'::timestamptz),
           ('2026-10-19 18:15Z'::timestamptz, '2026-10-19 19:00Z'::timestamptz),
           ('2026-10-19 20:00Z'::timestamptz, '2026-10-19 20:30Z'::timestamptz)$$,
  'clienta: el espacio desbloqueado vuelve a estar libre y la cita rechazada ya no ocupa (criterios 2 y 3)');

SELECT * FROM finish();
ROLLBACK;
