-- scheduling_manual_blocks_shorten.test.sql
-- US-AGE-07 · feature scheduling — staff acorta un bloqueo liberando su final (criterio 3): conserva
-- id, inicio y motivo; solo acorta (no alarga, no deja un bloqueo vacío); la clienta no puede, ni
-- siquiera saber que existe (SEC-001); lo liberado se ve libre en el calendario de la clienta
-- (criterio 2).
--
-- Complementa scheduling_manual_blocks_unblock.test.sql. El rol se siembra como superusuario local
-- dentro de la transacción; no se usa la service-role key (SEC-003) y todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000008a1', 'scheduling-shorten-admin@test.local'),
  ('00000000-0000-0000-0000-0000000008c1', 'scheduling-shorten-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000008a1';

INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-4000-8000-0000000008f1', 'zz-test recurso acortar bloqueos');

-- El lunes abre de 08:00 a 18:00 en Costa Rica (14:00Z a 00:00Z).
INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-4000-8000-0000000008f1', 1, 480, 1080);

-- Bloqueo de 08:00 a 11:00 (14:00Z a 17:00Z) con motivo, sembrado como superusuario.
INSERT INTO public.scheduling_manual_blocks (id, resource_id, starts_at, ends_at, reason, created_at)
VALUES ('00000000-0000-4000-8000-0000000008b1', '00000000-0000-4000-8000-0000000008f1',
        '2026-10-19 14:00Z', '2026-10-19 17:00Z', 'trámite', '2026-10-18 12:00Z');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008a1","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.scheduling_shorten_manual_block('00000000-0000-4000-8000-0000000008b1', '2026-10-19 16:00Z')$$,
  'admin: libera la última hora de un bloqueo de tres');

SELECT results_eq(
  $$SELECT id, starts_at, ends_at, reason, created_at FROM public.scheduling_manual_blocks
     WHERE resource_id = '00000000-0000-4000-8000-0000000008f1'$$,
  $$VALUES ('00000000-0000-4000-8000-0000000008b1'::uuid, '2026-10-19 14:00Z'::timestamptz,
            '2026-10-19 16:00Z'::timestamptz, 'trámite', '2026-10-18 12:00Z'::timestamptz)$$,
  'admin: el bloqueo conserva id, inicio, motivo y fecha de creación y termina antes');

SELECT throws_ok(
  $$SELECT public.scheduling_shorten_manual_block('00000000-0000-4000-8000-0000000008b1', '2026-10-19 16:30Z')$$,
  '22023', 'scheduling_manual_block_not_shortened',
  'admin: no se puede alargar un bloqueo');

SELECT throws_ok(
  $$SELECT public.scheduling_shorten_manual_block('00000000-0000-4000-8000-0000000008b1', '2026-10-19 16:00Z')$$,
  '22023', 'scheduling_manual_block_not_shortened',
  'admin: un fin igual al actual no acorta nada');

SELECT throws_ok(
  $$SELECT public.scheduling_shorten_manual_block('00000000-0000-4000-8000-0000000008b1', '2026-10-19 14:00Z')$$,
  '22023', 'scheduling_manual_block_not_shortened',
  'admin: no deja un bloqueo vacío; liberar todo es desbloquear');

SELECT throws_ok(
  $$SELECT public.scheduling_shorten_manual_block('00000000-0000-4000-8000-0000000008b1', NULL)$$,
  '22023', 'scheduling_manual_block_not_shortened',
  'admin: un fin nulo se rechaza');

SELECT throws_ok(
  $$SELECT public.scheduling_shorten_manual_block('00000000-0000-4000-8000-0000000008b9', '2026-10-19 15:00Z')$$,
  'P0002', 'scheduling_manual_block_not_found',
  'admin: un bloqueo que no existe se reporta');

SELECT is(
  (SELECT ends_at FROM public.scheduling_manual_blocks WHERE id = '00000000-0000-4000-8000-0000000008b1'),
  '2026-10-19 16:00Z'::timestamptz,
  'admin: los rechazos no cambiaron el bloqueo');

-- Lo liberado se puede volver a bloquear: no queda ningún resto del bloqueo viejo.
SELECT lives_ok(
  $$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
    VALUES ('00000000-0000-4000-8000-0000000008f1', '2026-10-19 16:00Z', '2026-10-19 16:30Z')$$,
  'admin: el tramo liberado se puede bloquear de nuevo');

-- ── Como clienta ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008c1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_shorten_manual_block('00000000-0000-4000-8000-0000000008b1', '2026-10-19 15:00Z')$$,
  'P0002', 'scheduling_manual_block_not_found',
  'clienta: para ella el bloqueo no existe, no puede acortarlo (SEC-001)');

SELECT results_eq(
  $$SELECT starts_at, ends_at
      FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000008f1', '2026-10-19')$$,
  $$VALUES ('2026-10-19 14:00Z'::timestamptz, '2026-10-19 16:30Z'::timestamptz)$$,
  'clienta: ve ocupado el bloqueo acortado y el tramo liberado, vuelto a bloquear, pegado a él (criterio 2)');

RESET ROLE;
SELECT is(
  (SELECT ends_at FROM public.scheduling_manual_blocks WHERE id = '00000000-0000-4000-8000-0000000008b1'),
  '2026-10-19 16:00Z'::timestamptz,
  'clienta: su intento no cambió el bloqueo');

SELECT * FROM finish();
ROLLBACK;
