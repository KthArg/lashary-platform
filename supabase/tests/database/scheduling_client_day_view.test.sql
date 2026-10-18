-- scheduling_client_day_view.test.sql
-- US-AGE-02 · feature scheduling — la clienta lee el día por scheduling_open_hours y
-- scheduling_busy_ranges: solo horas, nada del motivo ni de la cita (criterio 2), lo ocupado
-- incluye citas activas y bloqueos (criterio 3), y un cambio de la administradora se ve en la
-- siguiente lectura (criterio 4). Las tablas siguen cerradas para ella (SEC-001) y anon no
-- ejecuta las funciones.
--
-- El rol se siembra como superusuario local dentro de la transacción; no se usa la service-role
-- key (SEC-003) y todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(11);

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
INSERT INTO public.scheduling_appointments (resource_id, status, starts_at, ends_at, occupied_range)
VALUES
  ('00000000-0000-4000-8000-0000000003f1', 'approved',
   '2026-10-19 17:00Z', '2026-10-19 18:00Z', tstzrange('2026-10-19 17:00Z', '2026-10-19 18:15Z')),
  ('00000000-0000-4000-8000-0000000003f1', 'rejected',
   '2026-10-19 19:00Z', '2026-10-19 20:00Z', tstzrange('2026-10-19 19:00Z', '2026-10-19 20:00Z'));

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
    VALUES ('00000000-0000-4000-8000-0000000003f1', 1, 540, 720),
           ('00000000-0000-4000-8000-0000000003f1', 1, 780, 1020)$$,
  'admin: horario del lunes de 9 a 12 y de 13 a 17');

INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at, reason)
VALUES ('00000000-0000-4000-8000-0000000003f1', '2026-10-19 15:00Z', '2026-10-19 16:00Z', 'cita médica');

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
      FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1',
                                         '2026-10-19 06:00Z', '2026-10-20 06:00Z')$$,
  $$VALUES ('2026-10-19 15:00Z'::timestamptz, '2026-10-19 16:00Z'::timestamptz),
           ('2026-10-19 17:00Z'::timestamptz, '2026-10-19 18:15Z'::timestamptz)$$,
  'clienta: ocupado = bloqueo + cita aprobada con su limpieza; la rechazada no ocupa');

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1',
                                        '2026-10-19 06:00Z', '2026-10-25 06:00Z')),
  0, 'clienta: una ventana de más de dos días no devuelve nada');

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1',
                                        '2026-10-20 06:00Z', '2026-10-19 06:00Z')),
  0, 'clienta: una ventana invertida no devuelve nada y no falla');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_weekly_availability)
    + (SELECT count(*)::int FROM public.scheduling_manual_blocks)
    + (SELECT count(*)::int FROM public.scheduling_appointments),
  0, 'clienta: las tablas siguen cerradas (SEC-001)');

-- ── Un cambio de la administradora se ve en la siguiente lectura (criterio 4) ──
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);

INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind, label)
VALUES ('00000000-0000-4000-8000-0000000003f1', '2026-10-19', 'holiday', 'Cierre de prueba');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-19')),
  0, 'clienta: el día que la administradora cerró ya no tiene horario');

SELECT is(
  (SELECT count(*)::int
     FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-26')),
  2, 'clienta: el lunes siguiente, abierto, conserva su horario');

-- ── Como anon ───────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_open_hours('00000000-0000-4000-8000-0000000003f1', '2026-10-26')$$,
  '42501', NULL, 'anon: no ejecuta scheduling_open_hours');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_busy_ranges('00000000-0000-4000-8000-0000000003f1',
                                                '2026-10-19 06:00Z', '2026-10-20 06:00Z')$$,
  '42501', NULL, 'anon: no ejecuta scheduling_busy_ranges');

SELECT * FROM finish();
ROLLBACK;
