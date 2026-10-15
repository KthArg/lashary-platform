-- US-AGE-09 · scheduling — la función respeta la RLS de quien llama, el constraint sigue siendo la garantía y anon no la ejecuta.
-- La prueba de N reservas simultáneas es appointment-concurrency.integration.test.ts (pgTAP corre en una sola transacción).

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'scheduling-fn-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'scheduling-fn-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f1';

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname = 'scheduling_create_appointment'),
  false,
  'la función es SECURITY INVOKER: la RLS de la tabla aplica a quien llama');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

SELECT is(
  (SELECT status FROM public.scheduling_create_appointment(
     '00000000-0000-0000-0000-000000000a01',
     '2027-05-01 10:00+00', '2027-05-01 11:00+00',
     tstzrange('2027-05-01 09:45+00', '2027-05-01 11:15+00', '[)'))),
  'pending_approval',
  'admin: crea la cita y la devuelve en pending_approval');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments
    WHERE starts_at = '2027-05-01 10:00+00'),
  1, 'admin: la cita quedó guardada');

SELECT throws_ok(
  $$SELECT public.scheduling_create_appointment(
      '00000000-0000-0000-0000-000000000a01',
      '2027-05-01 10:00+00', '2027-05-01 11:00+00',
      tstzrange('2027-05-01 09:45+00', '2027-05-01 11:15+00', '[)'))$$,
  '23P01', NULL,
  'el mismo espacio sigue rechazándolo el constraint (exclusion_violation), no el código de la función');

SELECT throws_ok(
  $$SELECT public.scheduling_create_appointment(
      '00000000-0000-0000-0000-000000000a01',
      '2027-05-01 11:05+00', '2027-05-01 12:00+00',
      tstzrange('2027-05-01 10:50+00', '2027-05-01 12:15+00', '[)'))$$,
  '23P01', NULL,
  'chocar solo con la limpieza de la anterior también se rechaza por la función');

SELECT throws_ok(
  $$SELECT public.scheduling_create_appointment(
      '00000000-0000-0000-0000-000000000a01',
      '2027-05-02 10:00+00', '2027-05-02 11:00+00',
      tstzrange('2027-05-02 10:10+00', '2027-05-02 10:50+00', '[)'))$$,
  '23514', NULL,
  'los CHECK de la tabla también aplican a través de la función');

-- ── Como clienta (sin rol de staff) ─────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_create_appointment(
      '00000000-0000-0000-0000-000000000a01',
      '2027-05-03 10:00+00', '2027-05-03 11:00+00',
      tstzrange('2027-05-03 09:45+00', '2027-05-03 11:15+00', '[)'))$$,
  '42501', NULL,
  'clienta: la RLS bloquea el INSERT aunque pueda ejecutar la función');

-- ── Como anon ───────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.scheduling_create_appointment(
      '00000000-0000-0000-0000-000000000a01',
      '2027-05-04 10:00+00', '2027-05-04 11:00+00',
      tstzrange('2027-05-04 09:45+00', '2027-05-04 11:15+00', '[)'))$$,
  '42501', NULL,
  'anon: no tiene permiso para ejecutar la función');

-- La clienta y anon no dejaron nada.
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments
    WHERE starts_at >= '2027-05-02' AND starts_at < '2027-05-05'),
  0, 'los intentos rechazados no dejaron ninguna cita');

SELECT * FROM finish();
ROLLBACK;
