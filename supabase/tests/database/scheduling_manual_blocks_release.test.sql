-- scheduling_manual_blocks_release.test.sql — US-AGE-07, criterios 2, 3 y 4 (SEC-001, SEC-002).
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000009a1', 'scheduling-release-admin@test.local'),
  ('00000000-0000-0000-0000-0000000009c1', 'scheduling-release-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000009a1';

INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-4000-8000-0000000009f1', 'zz-test recurso liberar bloqueos');

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-4000-8000-0000000009f1', 1, 480, 1080);

INSERT INTO public.scheduling_manual_blocks (id, resource_id, starts_at, ends_at, reason, created_at)
VALUES
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009f1',
   '2026-10-19 14:00Z', '2026-10-19 17:00Z', 'trámite', '2026-10-18 12:00Z'),
  ('00000000-0000-4000-8000-0000000009b2', '00000000-0000-4000-8000-0000000009f1',
   '2026-10-19 19:00Z', '2026-10-19 20:00Z', 'banco', '2026-10-18 12:00Z'),
  ('00000000-0000-4000-8000-0000000009b3', '00000000-0000-4000-8000-0000000009f1',
   '2026-10-20 14:00Z', '2026-10-20 18:00Z', 'varios', '2026-10-18 12:00Z'),
  ('00000000-0000-4000-8000-0000000009b4', '00000000-0000-4000-8000-0000000009f1',
   '2026-10-22 14:00Z', '2026-10-22 17:00Z', 'con cita', '2026-10-18 12:00Z');

INSERT INTO public.scheduling_appointments (id, resource_id, status, starts_at, ends_at, occupied_range)
VALUES ('00000000-0000-4000-8000-0000000009e1', '00000000-0000-4000-8000-0000000009f1', 'pending_approval',
        '2026-10-22 16:00Z', '2026-10-22 16:30Z', tstzrange('2026-10-22 16:00Z', '2026-10-22 16:45Z'));

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a1","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-19 15:00Z']::timestamptz[], ARRAY['2026-10-19 16:00Z']::timestamptz[])$$,
  'admin: libera el medio de un bloqueo (09:00 a 10:00 de uno de 08:00 a 11:00)');

SELECT results_eq(
  $$SELECT starts_at, ends_at, reason FROM public.scheduling_manual_blocks
     WHERE resource_id = '00000000-0000-4000-8000-0000000009f1' AND starts_at < '2026-10-19 18:00Z'
     ORDER BY starts_at$$,
  $$VALUES ('2026-10-19 14:00Z'::timestamptz, '2026-10-19 15:00Z'::timestamptz, 'trámite'),
           ('2026-10-19 16:00Z'::timestamptz, '2026-10-19 17:00Z'::timestamptz, 'trámite')$$,
  'admin: liberar el medio parte el bloqueo en dos y los dos conservan el motivo');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE id = '00000000-0000-4000-8000-0000000009b1'
      AND starts_at = '2026-10-19 14:00Z' AND created_at = '2026-10-18 12:00Z'),
  1, 'admin: el primer tramo conserva el id, el inicio y la fecha de creación del bloqueo');

SELECT lives_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-19 14:00Z', '2026-10-19 16:30Z']::timestamptz[],
      ARRAY['2026-10-19 14:30Z', '2026-10-19 17:00Z']::timestamptz[])$$,
  'admin: libera el inicio de un tramo y el final del otro en una sola llamada');

SELECT results_eq(
  $$SELECT starts_at, ends_at, reason FROM public.scheduling_manual_blocks
     WHERE resource_id = '00000000-0000-4000-8000-0000000009f1' AND starts_at < '2026-10-19 18:00Z'
     ORDER BY starts_at$$,
  $$VALUES ('2026-10-19 14:30Z'::timestamptz, '2026-10-19 15:00Z'::timestamptz, 'trámite'),
           ('2026-10-19 16:00Z'::timestamptz, '2026-10-19 16:30Z'::timestamptz, 'trámite')$$,
  'admin: liberar el inicio y el final deja solo lo que sobra');

SELECT lives_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-19 19:00Z']::timestamptz[], ARRAY['2026-10-19 20:00Z']::timestamptz[])$$,
  'admin: libera un bloqueo completo');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE resource_id = '00000000-0000-4000-8000-0000000009f1'
      AND starts_at >= '2026-10-19 18:00Z' AND starts_at < '2026-10-20 00:00Z'),
  0, 'admin: liberar todo el bloqueo equivale a borrarlo');

SELECT lives_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-20 14:30Z', '2026-10-20 16:30Z']::timestamptz[],
      ARRAY['2026-10-20 15:00Z', '2026-10-20 17:00Z']::timestamptz[])$$,
  'admin: libera dos espacios que no son seguidos en una sola llamada');

SELECT results_eq(
  $$SELECT starts_at, ends_at, reason FROM public.scheduling_manual_blocks
     WHERE resource_id = '00000000-0000-4000-8000-0000000009f1'
       AND starts_at >= '2026-10-20 00:00Z' AND starts_at < '2026-10-21 00:00Z'
     ORDER BY starts_at$$,
  $$VALUES ('2026-10-20 14:00Z'::timestamptz, '2026-10-20 14:30Z'::timestamptz, 'varios'),
           ('2026-10-20 15:00Z'::timestamptz, '2026-10-20 16:30Z'::timestamptz, 'varios'),
           ('2026-10-20 17:00Z'::timestamptz, '2026-10-20 18:00Z'::timestamptz, 'varios')$$,
  'admin: dos espacios separados dejan tres tramos con el mismo motivo');

SELECT throws_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-21 14:00Z']::timestamptz[], ARRAY['2026-10-21 14:30Z']::timestamptz[])$$,
  'P0002', 'scheduling_manual_block_not_found',
  'admin: un espacio que no está bloqueado se reporta (ya estaba liberado)');

SELECT throws_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-20 15:00Z', '2026-10-23 14:00Z']::timestamptz[],
      ARRAY['2026-10-20 15:30Z', '2026-10-23 14:30Z']::timestamptz[])$$,
  'P0002', 'scheduling_manual_block_not_found',
  'admin: si uno de los espacios no está bloqueado, no se libera ninguno');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE resource_id = '00000000-0000-4000-8000-0000000009f1'
      AND starts_at >= '2026-10-20 00:00Z' AND starts_at < '2026-10-21 00:00Z'),
  3, 'admin: el rechazo no cambió el bloqueo del martes');

SELECT throws_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-20 15:00Z', '2026-10-20 16:00Z']::timestamptz[],
      ARRAY['2026-10-20 15:30Z']::timestamptz[])$$,
  '22023', 'scheduling_manual_ranges_invalid',
  'admin: listas de distinto tamaño se rechazan');

SELECT throws_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY[]::timestamptz[], ARRAY[]::timestamptz[])$$,
  '22023', 'scheduling_manual_ranges_invalid',
  'admin: sin ningún espacio se rechaza');

SELECT throws_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-20 15:30Z']::timestamptz[], ARRAY['2026-10-20 15:00Z']::timestamptz[])$$,
  '22023', 'scheduling_manual_ranges_invalid',
  'admin: un espacio con el fin antes del inicio se rechaza');

SELECT throws_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-22 14:00Z']::timestamptz[], ARRAY['2026-10-22 15:00Z']::timestamptz[])$$,
  '23514', 'scheduling_manual_blocks_active_appointment',
  'admin: si lo que sobra se cruza con una cita activa, el trigger lo rechaza (criterio 4)');

SELECT results_eq(
  $$SELECT id, starts_at, ends_at, reason FROM public.scheduling_manual_blocks
     WHERE resource_id = '00000000-0000-4000-8000-0000000009f1'
       AND starts_at >= '2026-10-22 00:00Z' AND starts_at < '2026-10-23 00:00Z'$$,
  $$VALUES ('00000000-0000-4000-8000-0000000009b4'::uuid, '2026-10-22 14:00Z'::timestamptz,
            '2026-10-22 17:00Z'::timestamptz, 'con cita')$$,
  'admin: al fallar el reinserto no cambia nada, el bloqueo sigue entero');

-- ── Como clienta ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009c1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_release_manual_ranges('00000000-0000-4000-8000-0000000009f1',
      ARRAY['2026-10-19 14:30Z']::timestamptz[], ARRAY['2026-10-19 15:00Z']::timestamptz[])$$,
  'P0002', 'scheduling_manual_block_not_found',
  'clienta: para ella no hay bloqueos, recibe el mismo no existe y no libera nada (SEC-001)');

SELECT results_eq(
  $$SELECT starts_at, ends_at
      FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000009f1', '2026-10-19')$$,
  $$VALUES ('2026-10-19 14:30Z'::timestamptz, '2026-10-19 15:00Z'::timestamptz),
           ('2026-10-19 16:00Z'::timestamptz, '2026-10-19 16:30Z'::timestamptz)$$,
  'clienta: ve libre lo que se liberó y ocupado solo lo que sigue bloqueado (criterio 2)');

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE resource_id = '00000000-0000-4000-8000-0000000009f1'
      AND starts_at >= '2026-10-19 00:00Z' AND starts_at < '2026-10-20 00:00Z'),
  2, 'clienta: su intento no cambió ningún bloqueo');

SELECT * FROM finish();
ROLLBACK;
