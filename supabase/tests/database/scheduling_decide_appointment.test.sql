-- US-AGE-09 · scheduling — aprobar y rechazar citas pendientes (ADR-0003).
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'scheduling-decide-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'scheduling-decide-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000d1';

INSERT INTO public.scheduling_appointments (id, resource_id, starts_at, ends_at, occupied_range)
VALUES
  ('00000000-0000-0000-0000-00000000d901', '00000000-0000-0000-0000-000000000a01',
   '2027-07-01 10:00+00', '2027-07-01 11:00+00', tstzrange('2027-07-01 09:45+00', '2027-07-01 11:15+00', '[)')),
  ('00000000-0000-0000-0000-00000000d902', '00000000-0000-0000-0000-000000000a01',
   '2027-07-02 10:00+00', '2027-07-02 11:00+00', tstzrange('2027-07-02 09:45+00', '2027-07-02 11:15+00', '[)')),
  ('00000000-0000-0000-0000-00000000d903', '00000000-0000-0000-0000-000000000a01',
   '2027-07-03 10:00+00', '2027-07-03 11:00+00', tstzrange('2027-07-03 09:45+00', '2027-07-03 11:15+00', '[)'));

-- ── Clienta: la RLS le oculta la cita, no la decide ──────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000d901', 'approved')),
  0, 'clienta: no decide ninguna cita');

-- ── Admin ────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

SELECT is(
  (SELECT decided_by FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000d901', 'approved', NULL, '2027-07-01 10:00+00')),
  '00000000-0000-0000-0000-0000000000d1'::uuid,
  'admin: aprobar registra quién decidió desde la sesión, no desde un parámetro');

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000d901'),
  'approved', 'admin: la cita quedó aprobada');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000d901', 'rejected')),
  0, 'admin: una cita ya decidida no se vuelve a decidir');

SELECT is(
  (SELECT decision_reason FROM public.scheduling_decide_appointment(
     '00000000-0000-0000-0000-00000000d902', 'rejected', 'horario no disponible')),
  'horario no disponible', 'admin: rechazar guarda el motivo');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2027-07-02 10:00+00', '2027-07-02 11:00+00',
            tstzrange('2027-07-02 09:45+00', '2027-07-02 11:15+00', '[)'))$$,
  'rechazar libera el espacio: otra cita puede ocupar el mismo horario');

SELECT throws_ok(
  $$SELECT public.scheduling_decide_appointment('00000000-0000-0000-0000-00000000d903', 'completed')$$,
  '42501', NULL,
  'admin: solo puede decidir aprobada o rechazada');

SELECT throws_ok(
  $$SELECT public.scheduling_decide_appointment('00000000-0000-0000-0000-00000000d903', 'rejected', repeat('x', 501))$$,
  '23514', NULL,
  'admin: el motivo tiene un máximo de 500 caracteres');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET starts_at = '2027-07-05 10:00+00'
     WHERE id = '00000000-0000-0000-0000-00000000d903'$$,
  '42501', NULL,
  'admin: el horario no se puede editar, solo las columnas de la decisión');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments
       SET decided_by = '00000000-0000-0000-0000-0000000000d2'
     WHERE id = '00000000-0000-0000-0000-00000000d903'$$,
  '42501', NULL,
  'admin: no puede falsear quién decidió con un UPDATE directo');

UPDATE public.scheduling_appointments SET status = 'approved'
 WHERE id = '00000000-0000-0000-0000-00000000d903';

SELECT is(
  (SELECT decided_by FROM public.scheduling_appointments
    WHERE id = '00000000-0000-0000-0000-00000000d903'),
  '00000000-0000-0000-0000-0000000000d1'::uuid,
  'admin: aun con un UPDATE directo del estado, quien decide lo fija la base');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, status, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', 'approved',
            '2027-08-01 10:00+00', '2027-08-01 11:00+00',
            tstzrange('2027-08-01 09:45+00', '2027-08-01 11:15+00', '[)'))$$,
  '42501', NULL,
  'admin: no puede insertar una cita ya aprobada, nace pendiente');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, decided_by, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-0000000000d2',
            '2027-08-02 10:00+00', '2027-08-02 11:00+00',
            tstzrange('2027-08-02 09:45+00', '2027-08-02 11:15+00', '[)'))$$,
  '42501', NULL,
  'admin: no puede insertar una cita con una decisión falsificada');

-- ── Anon ─────────────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.scheduling_decide_appointment('00000000-0000-0000-0000-00000000d903', 'approved')$$,
  '42501', NULL,
  'anon: no tiene permiso para ejecutar la función');

SELECT * FROM finish();
ROLLBACK;
