-- US-AGE-09 · scheduling — criterios 1 a 3: no-solape por constraint, rango con preparación y limpieza, solo estados activos.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'scheduling-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'scheduling-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000e1';

-- Un segundo recurso, para probar que el constraint es por recurso (ADR-0005).
INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-0000-0000-000000000a02', 'Segunda técnica');

SELECT is(
  (SELECT name FROM public.scheduling_resources WHERE id = '00000000-0000-0000-0000-000000000a01'),
  'Estudio',
  'el recurso único del estudio viene sembrado por la migración');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), true, 'admin: auth_is_staff() es true');

-- Cita base: servicio 10:00-11:00, ocupa 09:45-11:15 (15 min de preparación y de limpieza).
SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (id, resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-00000000a901',
            '00000000-0000-0000-0000-000000000a01',
            '2027-03-01 10:00+00', '2027-03-01 11:00+00',
            tstzrange('2027-03-01 09:45+00', '2027-03-01 11:15+00', '[)'))$$,
  'admin: INSERT permitido; una cita nueva nace pending_approval y ocupa su espacio');

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000a901'),
  'pending_approval',
  'la cita nace en pending_approval (ADR-0003)');

-- Criterio 1: el mismo horario exacto choca.
SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01',
            '2027-03-01 10:00+00', '2027-03-01 11:00+00',
            tstzrange('2027-03-01 09:45+00', '2027-03-01 11:15+00', '[)'))$$,
  '23P01', NULL,
  'criterio 1: el mismo espacio y horario lo rechaza la base (exclusion_violation)');

-- Criterio 2: el servicio nuevo empieza a las 11:05, DESPUÉS de que la cita base termina (11:00)
-- pero dentro de su limpieza (hasta 11:15): el rango ocupado, no el servicio, es lo que choca.
SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01',
            '2027-03-01 11:05+00', '2027-03-01 12:00+00',
            tstzrange('2027-03-01 10:50+00', '2027-03-01 12:15+00', '[)'))$$,
  '23P01', NULL,
  'criterio 2: chocar solo con la limpieza de la cita anterior también se rechaza');

-- Los rangos [) pegados no se tocan: 11:15 libre.
SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (id, resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-00000000a902',
            '00000000-0000-0000-0000-000000000a01',
            '2027-03-01 11:30+00', '2027-03-01 12:30+00',
            tstzrange('2027-03-01 11:15+00', '2027-03-01 12:45+00', '[)'))$$,
  'rangos contiguos [) no se pisan: la cita que empieza justo al terminar la limpieza entra');

-- ADR-0005: el constraint es por recurso; otra técnica atiende en paralelo.
SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a02',
            '2027-03-01 10:00+00', '2027-03-01 11:00+00',
            tstzrange('2027-03-01 09:45+00', '2027-03-01 11:15+00', '[)'))$$,
  'otro recurso en el mismo horario no choca (ADR-0005)');

-- Criterio 3: un estado inactivo no ocupa, aunque el horario coincida con una cita activa.
SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, status, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', 'rejected',
            '2027-03-01 10:00+00', '2027-03-01 11:00+00',
            tstzrange('2027-03-01 09:45+00', '2027-03-01 11:15+00', '[)'))$$,
  'criterio 3: una cita rejected no choca con una activa');

-- Coherencia del rango con el servicio.
SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01',
            '2027-03-02 10:00+00', '2027-03-02 11:00+00',
            tstzrange('2027-03-02 10:10+00', '2027-03-02 10:50+00', '[)'))$$,
  '23514', NULL,
  'un rango que no cubre el servicio completo se rechaza (nadie ocupa menos de lo que dura)');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01',
            '2027-03-02 10:00+00', '2027-03-02 11:00+00',
            tstzrange('2027-03-02 09:45+00', NULL, '[)'))$$,
  '23514', NULL,
  'un rango sin fin se rechaza (no puede bloquear la agenda para siempre)');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01',
            '2027-03-02 11:00+00', '2027-03-02 10:00+00',
            tstzrange('2027-03-02 09:45+00', '2027-03-02 11:15+00', '[)'))$$,
  '23514', NULL,
  'un servicio que termina antes de empezar se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, status, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', 'inventado',
            '2027-03-02 10:00+00', '2027-03-02 11:00+00',
            tstzrange('2027-03-02 09:45+00', '2027-03-02 11:15+00', '[)'))$$,
  '23514', NULL,
  'un estado fuera del vocabulario se rechaza');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET status = 'cancelled'
     WHERE id = '00000000-0000-0000-0000-00000000a901'$$,
  '42501', NULL,
  'admin: UPDATE a un estado distinto de aprobada o rechazada lo bloquea la política');

DELETE FROM public.scheduling_appointments
 WHERE id = '00000000-0000-0000-0000-00000000a901';

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000a901'),
  'pending_approval',
  'admin: la cita sigue ahí, DELETE no tiene política');

-- ── Como clienta (contraste: las mismas tablas, sin rol de staff) ───────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), false, 'clienta: auth_is_staff() es false');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments),
  0, 'clienta: SELECT no ve ninguna cita');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_resources),
  0, 'clienta: SELECT no ve ningún recurso');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01',
            '2027-04-01 10:00+00', '2027-04-01 11:00+00',
            tstzrange('2027-04-01 09:45+00', '2027-04-01 11:15+00', '[)'))$$,
  '42501', NULL,
  'clienta: INSERT bloqueado por RLS');

-- ── Criterio 3, la otra mitad: cancelar libera el espacio (sin RLS de por medio) ────────────
RESET ROLE;

UPDATE public.scheduling_appointments SET status = 'cancelled'
 WHERE id = '00000000-0000-0000-0000-00000000a901';

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01',
            '2027-03-01 10:00+00', '2027-03-01 11:00+00',
            tstzrange('2027-03-01 09:45+00', '2027-03-01 11:15+00', '[)'))$$,
  'criterio 3: una cita cancelled libera el espacio y se puede volver a reservar');

SELECT * FROM finish();
ROLLBACK;
