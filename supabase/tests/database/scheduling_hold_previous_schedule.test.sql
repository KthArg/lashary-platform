-- US-AGE-10 · scheduling — hallazgo A2: mientras un reagendado espera decisión, la cita guarda su
-- horario anterior y ninguna otra cita puede ocupar ni el espacio nuevo ni el anterior.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000001f1', 'scheduling-hold-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000001f1';

-- Cita reagendada: el horario aprobado era el 2041-05-06 10:00-11:00 (ocupa 09:45-11:15) y la clienta
-- pidió el 2041-05-07 10:00-11:00 (ocupa 09:45-11:15). Las columnas `previous_*` las escribe la función
-- de reagendar; aquí se siembran directo, como dueño de la tabla.
INSERT INTO public.scheduling_appointments (
  id, resource_id, status, starts_at, ends_at, occupied_range,
  previous_starts_at, previous_ends_at, previous_occupied_range, previous_status
)
VALUES (
  '00000000-0000-0000-0000-0000000001f9', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
  '2041-05-07 10:00+00', '2041-05-07 11:00+00', tstzrange('2041-05-07 09:45+00', '2041-05-07 11:15+00', '[)'),
  '2041-05-06 10:00+00', '2041-05-06 11:00+00', tstzrange('2041-05-06 09:45+00', '2041-05-06 11:15+00', '[)'),
  'approved'
);

SELECT is(
  (SELECT blocked_ranges FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-0000000001f9'),
  '{["2041-05-06 09:45+00","2041-05-06 11:15+00"), ["2041-05-07 09:45+00","2041-05-07 11:15+00")}'::tstzmultirange,
  'la cita ocupa los dos espacios: el vigente y el anterior');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET previous_status = NULL
     WHERE id = '00000000-0000-0000-0000-0000000001f9'$$,
  '23514', NULL,
  'el horario anterior va completo: no puede quedar a medias');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET previous_status = 'pending_approval'
     WHERE id = '00000000-0000-0000-0000-0000000001f9'$$,
  '23514', NULL,
  'solo una cita aprobada o confirmada guarda su horario anterior');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments
       SET previous_occupied_range = tstzrange('2041-05-06 10:15+00', '2041-05-06 11:15+00', '[)')
     WHERE id = '00000000-0000-0000-0000-0000000001f9'$$,
  '23514', NULL,
  'el rango anterior cubre el servicio anterior completo');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000001f1","role":"authenticated"}', true);

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-05-06 10:30+00', '2041-05-06 11:00+00',
            tstzrange('2041-05-06 10:15+00', '2041-05-06 11:15+00', '[)'))$$,
  '23P01', NULL,
  'otra cita no puede ocupar el espacio anterior mientras el reagendado espera');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-05-07 10:30+00', '2041-05-07 11:00+00',
            tstzrange('2041-05-07 10:15+00', '2041-05-07 11:15+00', '[)'))$$,
  '23P01', NULL,
  'otra cita tampoco puede ocupar el espacio nuevo');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-05-06 11:30+00', '2041-05-06 12:30+00',
            tstzrange('2041-05-06 11:15+00', '2041-05-06 12:45+00', '[)'))$$,
  'una cita justo después del espacio anterior sí entra (rangos [) contiguos)');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments
      (resource_id, starts_at, ends_at, occupied_range,
       previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-05-08 10:00+00', '2041-05-08 11:00+00',
            tstzrange('2041-05-08 09:45+00', '2041-05-08 11:15+00', '[)'),
            '2041-05-09 10:00+00', '2041-05-09 11:00+00',
            tstzrange('2041-05-09 09:45+00', '2041-05-09 11:15+00', '[)'), 'approved')$$,
  '42501', NULL,
  'admin: una cita nueva no nace con horario anterior');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET previous_status = NULL
     WHERE id = '00000000-0000-0000-0000-0000000001f9'$$,
  '42501', NULL,
  'admin: no puede editar el horario anterior con un UPDATE directo');

RESET ROLE;

-- Sin horario anterior, el constraint es el de antes: una cita rechazada libera su espacio.
UPDATE public.scheduling_appointments
   SET status = 'cancelled', previous_starts_at = NULL, previous_ends_at = NULL,
       previous_occupied_range = NULL, previous_status = NULL
 WHERE id = '00000000-0000-0000-0000-0000000001f9';

SELECT is(
  (SELECT blocked_ranges FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-0000000001f9'),
  '{["2041-05-07 09:45+00","2041-05-07 11:15+00")}'::tstzmultirange,
  'sin horario anterior, la cita ocupa solo su espacio vigente');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-05-07 10:00+00', '2041-05-07 11:00+00',
            tstzrange('2041-05-07 09:45+00', '2041-05-07 11:15+00', '[)'))$$,
  'una cita que ya no está activa no ocupa ningún espacio');

SELECT * FROM finish();
ROLLBACK;
