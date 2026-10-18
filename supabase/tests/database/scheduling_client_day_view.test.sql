-- scheduling_client_day_view.test.sql
-- US-AGE-02 · feature scheduling — la clienta lee el día por scheduling_open_hours y
-- scheduling_busy_ranges: solo horas, nada del motivo ni de la cita, y lo ocupado unido, recortado
-- al horario y con el final redondeado a la grilla de 30 minutos, así no se lee la duración de una
-- cita (criterio 2); lo ocupado incluye citas activas y bloqueos (criterio 3), y cada cambio de la
-- administradora se ve en la siguiente lectura (criterio 4). Las tablas siguen cerradas para ella
-- (SEC-001) y anon no ejecuta las funciones.
--
-- El rol se siembra como superusuario local dentro de la transacción; no se usa la service-role
-- key (SEC-003) y todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000003a1', 'scheduling-day-admin@test.local'),
  ('00000000-0000-0000-0000-0000000003c1', 'scheduling-day-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000003a1';

-- Recurso propio de la prueba: los asserts no dependen de lo que ya tenga la base.
INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-4000-8000-0000000003f1', 'zz-test recurso calendario');

-- Citas sembradas como superusuario (la reserva real es US-AGE-05). 2026-10-19 es lunes; en
-- Costa Rica (UTC-6) las 11:00 locales son las 17:00Z.
--   · aprobada de 11:00 a 12:00 con limpieza hasta las 12:15, que cae en el almuerzo;
--   · rechazada de 13:00 a 14:00: no ocupa;
--   · pendiente de 14:00 a 14:40 con limpieza hasta las 14:50: un final fuera de la grilla;
--   · confirmada de 16:00 a 16:30: ocupa;
--   · cancelada de 10:00 a 10:30 y completada de 10:30 a 11:00: no ocupan.
INSERT INTO public.scheduling_appointments (resource_id, status, starts_at, ends_at, occupied_range)
VALUES
  ('00000000-0000-4000-8000-0000000003f1', 'approved',
   '2026-10-19 17:00Z', '2026-10-19 18:00Z', tstzrange('2026-10-19 17:00Z', '2026-10-19 18:15Z')),
  ('00000000-0000-4000-8000-0000000003f1', 'rejected',
   '2026-10-19 19:00Z', '2026-10-19 20:00Z', tstzrange('2026-10-19 19:00Z', '2026-10-19 20:00Z')),
  ('00000000-0000-4000-8000-0000000003f1', 'pending_approval',
   '2026-10-19 20:00Z', '2026-10-19 20:40Z', tstzrange('2026-10-19 20:00Z', '2026-10-19 20:50Z')),
  ('00000000-0000-4000-8000-0000000003f1', 'confirmed',
   '2026-10-19 22:00Z', '2026-10-19 22:30Z', tstzrange('2026-10-19 22:00Z', '2026-10-19 22:30Z')),
  ('00000000-0000-4000-8000-0000000003f1', 'cancelled',
   '2026-10-19 16:00Z', '2026-10-19 16:30Z', tstzrange('2026-10-19 16:00Z', '2026-10-19 16:30Z')),
  ('00000000-0000-4000-8000-0000000003f1', 'completed',
   '2026-10-19 16:30Z', '2026-10-19 17:00Z', tstzrange('2026-10-19 16:30Z', '2026-10-19 17:00Z'));

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
    VALUES ('00000000-0000-4000-8000-0000000003f1', 1, 540, 720),
           ('00000000-0000-4000-8000-0000000003f1', 1, 780, 1020)$$,
  'admin: horario del lunes de 9 a 12 y de 13 a 17');

-- Bloqueos de 9:00 a 10:00 y de 15:00 a 15:30 (este último, pegado a la cita pendiente).
INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at, reason)
VALUES ('00000000-0000-4000-8000-0000000003f1', '2026-10-19 15:00Z', '2026-10-19 16:00Z', 'cita médica'),
       ('00000000-0000-4000-8000-0000000003f1', '2026-10-19 21:00Z', '2026-10-19 21:30Z', 'trámite');

-- ── Como clienta ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003c1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT start_min, end_min
      FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-19')$$,
  $$VALUES (540, 720), (780, 1020)$$,
  'clienta: el lunes ve los bloques del lunes, ordenados');

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-20')),
  0, 'clienta: el martes, sin bloques, no tiene horario');

SELECT results_eq(
  $$SELECT starts_at, ends_at
      FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1', '2026-10-19')$$,
  $$VALUES ('2026-10-19 15:00Z'::timestamptz, '2026-10-19 16:00Z'::timestamptz),
           ('2026-10-19 17:00Z'::timestamptz, '2026-10-19 18:00Z'::timestamptz),
           ('2026-10-19 20:00Z'::timestamptz, '2026-10-19 21:30Z'::timestamptz),
           ('2026-10-19 22:00Z'::timestamptz, '2026-10-19 22:30Z'::timestamptz)$$,
  'clienta: lo ocupado no deja leer la duración de una cita: la limpieza que cae en el almuerzo '
  'se recorta, el final de 14:50 sube a 15:00 y la cita pendiente y el bloqueo pegado salen como '
  'un solo rango; la confirmada ocupa; la rechazada, la cancelada y la completada no ocupan (si '
  'ocuparan, de 9:00 a 12:00 saldría un solo rango)');

SELECT is(
  (SELECT array_agg(k ORDER BY k)
     FROM jsonb_object_keys((
       SELECT to_jsonb(t)
         FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1', '2026-10-19') t
        LIMIT 1)) AS k),
  ARRAY['ends_at', 'starts_at'],
  'clienta: cada fila de lo ocupado trae solo inicio y fin (criterio 2, SEC-002)');

SELECT is(
  (SELECT array_agg(k ORDER BY k)
     FROM jsonb_object_keys((
       SELECT to_jsonb(t)
         FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-19') t
        LIMIT 1)) AS k),
  ARRAY['end_min', 'start_min'],
  'clienta: cada fila del horario trae solo inicio y fin (SEC-002)');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_weekly_availability)
    + (SELECT count(*)::int FROM public.scheduling_manual_blocks)
    + (SELECT count(*)::int FROM public.scheduling_appointments),
  0, 'clienta: las tablas siguen cerradas (SEC-001)');

-- ── Bloques que se tocan: la grilla empieza en el primero, como en computeDaySlots ──
-- Miércoles 2026-10-21 de 9:00 a 12:15 y de 12:15 a 18:00, con una cita de 12:00 a 12:40. Si la
-- función no uniera los bloques, el final redondearía desde las 12:15 (12:45, 18:45Z) y no desde
-- las 9:00 (13:00, 19:00Z), y no coincidiría con los espacios que ofrece el dominio.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);
INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-4000-8000-0000000003f1', 3, 540, 735), ('00000000-0000-4000-8000-0000000003f1', 3, 735, 1080);
RESET ROLE;
INSERT INTO public.scheduling_appointments (resource_id, status, starts_at, ends_at, occupied_range)
VALUES ('00000000-0000-4000-8000-0000000003f1', 'approved', '2026-10-21 18:00Z', '2026-10-21 18:40Z', tstzrange('2026-10-21 18:00Z', '2026-10-21 18:40Z'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003c1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT starts_at, ends_at
      FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1', '2026-10-21')$$,
  $$VALUES ('2026-10-21 18:00Z'::timestamptz, '2026-10-21 19:00Z'::timestamptz)$$,
  'clienta: con dos bloques que se tocan, el final redondea desde el inicio del primero');

-- ── Cada cambio de la administradora se ve en la siguiente lectura (criterio 4) ──
-- Sobre el lunes 2026-10-26, que todavía no tiene nada ocupado.
SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1', '2026-10-26')),
  0, 'clienta: el lunes 26 empieza libre');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);
INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
VALUES ('00000000-0000-4000-8000-0000000003f1', '2026-10-26 16:00Z', '2026-10-26 16:30Z');
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003c1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT starts_at, ends_at
      FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1', '2026-10-26')$$,
  $$VALUES ('2026-10-26 16:00Z'::timestamptz, '2026-10-26 16:30Z'::timestamptz)$$,
  'clienta: el espacio que la administradora bloquea se ve ocupado en la siguiente lectura');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);
INSERT INTO public.scheduling_weekly_availability (id, resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-4000-8000-0000000003d1', '00000000-0000-4000-8000-0000000003f1', 1, 1020, 1080);
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-26')),
  3, 'clienta: el bloque semanal que la administradora agrega se ve en la siguiente lectura');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);
DELETE FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000003d1';
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-26')),
  2, 'clienta: el bloque semanal que la administradora quita deja de verse en la siguiente lectura');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);
INSERT INTO public.scheduling_closed_dates (id, resource_id, closed_on, kind, label)
VALUES ('00000000-0000-4000-8000-0000000003e1', '00000000-0000-4000-8000-0000000003f1', '2026-10-26',
        'holiday', 'Cierre de prueba');
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-26')),
  0, 'clienta: el día que la administradora cierra ya no tiene horario en la siguiente lectura');

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1', '2026-10-26')),
  0, 'clienta: un día cerrado tampoco muestra lo ocupado');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);
DELETE FROM public.scheduling_closed_dates WHERE id = '00000000-0000-4000-8000-0000000003e1';
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-26')),
  2, 'clienta: el día que la administradora reabre recupera su horario en la siguiente lectura');

-- ── Como anon ───────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-26')$$,
  '42501', NULL, 'anon: no ejecuta scheduling_open_hours');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1', '2026-10-26')$$,
  '42501', NULL, 'anon: no ejecuta scheduling_busy_ranges');

SELECT * FROM finish();
ROLLBACK;
