BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000004ea1', 'notes-a@test.local'),
  ('00000000-0000-0000-0000-000000004ea2', 'notes-b@test.local'),
  ('00000000-0000-0000-0000-000000004ea9', 'notes-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000004ea9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004ea1',
   'Anotada A', 'notes-a@test.local', '+50688884001'),
  ('00000000-0000-0000-0000-000000004ca2', '00000000-0000-0000-0000-000000004ea2',
   'Anotada B', 'notes-b@test.local', '+50688884002');

INSERT INTO public.scheduling_appointments
  (id, resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000004a01', '00000000-0000-0000-0000-000000000a01',
   '2026-05-10 16:00+00', '2026-05-10 17:00+00',
   tstzrange('2026-05-10 16:00+00', '2026-05-10 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000001e01', 'De A', true, 1000, 0),
  ('00000000-0000-0000-0000-000000004a02', '00000000-0000-0000-0000-000000000a01',
   '2026-05-11 16:00+00', '2026-05-11 17:00+00',
   tstzrange('2026-05-11 16:00+00', '2026-05-11 17:15+00', '[)'), 'cancelled',
   '00000000-0000-0000-0000-000000004ca2', '00000000-0000-0000-0000-000000001e01', 'De B', true, 1000, 0);

INSERT INTO public.clients_appointment_notes
  (id, client_id, appointment_id, body, created_by, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000004d02', '00000000-0000-0000-0000-000000004ca1',
   '00000000-0000-0000-0000-000000004a01', 'Nota de ayer',
   '00000000-0000-0000-0000-000000004ea9', '2026-05-10 18:00+00', '2026-05-10 18:00+00');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000004ea9","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO public.clients_appointment_notes (id, client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004d01', '00000000-0000-0000-0000-000000004ca1',
            '00000000-0000-0000-0000-000000004a01', 'Llegó con los ojos irritados',
            '00000000-0000-0000-0000-000000004ea9')$$,
  'la administradora anota una cita de la clienta');

SELECT lives_ok(
  $$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004a01',
            'Prefiere la tarde', '00000000-0000-0000-0000-000000004ea9')$$,
  'una cita admite varias anotaciones');

SELECT throws_ok(
  $$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004a02',
            'Cita ajena', '00000000-0000-0000-0000-000000004ea9')$$,
  '23503', NULL,
  'no se puede anotar en una clienta la cita de otra');

SELECT throws_ok(
  $$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004aff',
            'Cita inventada', '00000000-0000-0000-0000-000000004ea9')$$,
  '23503', NULL,
  'no se puede anotar una cita que no existe');

SELECT throws_ok(
  $$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004a01',
            '', '00000000-0000-0000-0000-000000004ea9')$$,
  '23514', NULL,
  'una anotación vacía se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004a01',
            '  con espacios  ', '00000000-0000-0000-0000-000000004ea9')$$,
  '23514', NULL,
  'una anotación con espacios al inicio o al final se rechaza');

SELECT lives_ok(
  format($$INSERT INTO public.clients_appointment_notes (id, client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004d03', '00000000-0000-0000-0000-000000004ca1',
            '00000000-0000-0000-0000-000000004a01', %L, '00000000-0000-0000-0000-000000004ea9')$$,
    repeat('x', 2000)),
  'una anotación de 2000 caracteres entra');

SELECT throws_ok(
  format($$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004a01',
            %L, '00000000-0000-0000-0000-000000004ea9')$$,
    repeat('x', 2001)),
  '23514', NULL,
  'una anotación de 2001 caracteres se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004a01',
            'Firmada por otra', '00000000-0000-0000-0000-000000004ea1')$$,
  '42501', NULL,
  'la administradora no puede firmar una anotación a nombre de otra persona');

SELECT throws_ok(
  $$UPDATE public.clients_appointment_notes
       SET appointment_id = '00000000-0000-0000-0000-000000004a02'
     WHERE id = '00000000-0000-0000-0000-000000004d01'$$,
  '23514', NULL,
  'una anotación no se puede mover a otra cita');

SELECT throws_ok(
  $$UPDATE public.clients_appointment_notes
       SET created_at = '2020-01-01 00:00+00'
     WHERE id = '00000000-0000-0000-0000-000000004d01'$$,
  '23514', NULL,
  'la fecha de creación no se puede reescribir');

UPDATE public.clients_appointment_notes
   SET body = 'Nota de ayer, corregida'
 WHERE id = '00000000-0000-0000-0000-000000004d02';

SELECT results_eq(
  $$SELECT body, created_at, updated_at = now() FROM public.clients_appointment_notes
     WHERE id = '00000000-0000-0000-0000-000000004d02'$$,
  $$VALUES ('Nota de ayer, corregida'::text, '2026-05-10 18:00+00'::timestamptz, true)$$,
  'editar cambia el texto y la fecha de modificación, y conserva la de creación');

SELECT results_eq(
  $$WITH deleted AS (
      DELETE FROM public.clients_appointment_notes
       WHERE id = '00000000-0000-0000-0000-000000004d03' RETURNING id)
    SELECT count(*) FROM deleted$$,
  $$VALUES (1::bigint)$$,
  'la administradora elimina una anotación');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000004ea1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.clients_appointment_notes),
  0::bigint,
  'una clienta no lee anotaciones, ni las de sus propias citas');

SELECT throws_ok(
  $$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004a01',
            'Escrita por la clienta', '00000000-0000-0000-0000-000000004ea1')$$,
  '42501', NULL,
  'una clienta no crea anotaciones, ni en su propia cita');

SELECT results_eq(
  $$WITH changed AS (
      UPDATE public.clients_appointment_notes SET body = 'Cambiada por la clienta'
       WHERE id = '00000000-0000-0000-0000-000000004d01' RETURNING id)
    SELECT count(*) FROM changed$$,
  $$VALUES (0::bigint)$$,
  'una clienta no edita anotaciones');

SELECT results_eq(
  $$WITH deleted AS (
      DELETE FROM public.clients_appointment_notes
       WHERE id = '00000000-0000-0000-0000-000000004d01' RETURNING id)
    SELECT count(*) FROM deleted$$,
  $$VALUES (0::bigint)$$,
  'una clienta no elimina anotaciones');

RESET ROLE;

SELECT is(
  (SELECT body FROM public.clients_appointment_notes WHERE id = '00000000-0000-0000-0000-000000004d01'),
  'Llegó con los ojos irritados',
  'la anotación sigue intacta después de los intentos de la clienta');

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM public.clients_appointment_notes$$,
  '42501', NULL,
  'un anónimo no lee anotaciones');

SELECT throws_ok(
  $$INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by)
    VALUES ('00000000-0000-0000-0000-000000004ca1', '00000000-0000-0000-0000-000000004a01',
            'Anónima', '00000000-0000-0000-0000-000000004ea1')$$,
  '42501', NULL,
  'un anónimo no crea anotaciones');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
