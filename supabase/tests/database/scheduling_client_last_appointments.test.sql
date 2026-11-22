BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000003ea1', 'last-appointment-a@test.local'),
  ('00000000-0000-0000-0000-000000003ea2', 'last-appointment-b@test.local'),
  ('00000000-0000-0000-0000-000000003ea9', 'last-appointment-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000003ea9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000003ca1', '00000000-0000-0000-0000-000000003ea1',
   'Cita A', 'last-appointment-a@test.local', '+50688883001'),
  ('00000000-0000-0000-0000-000000003ca2', '00000000-0000-0000-0000-000000003ea2',
   'Cita B', 'last-appointment-b@test.local', '+50688883002'),
  ('00000000-0000-0000-0000-000000003ca3', NULL,
   'Cita C cancelada', 'last-appointment-c@test.local', '+50688883003'),
  ('00000000-0000-0000-0000-000000003ca4', NULL,
   'Cita D sin citas', 'last-appointment-d@test.local', '+50688883004');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
SELECT ('00000000-0000-0000-0000-000000003c0' || status_row.position)::uuid, NULL,
       'Estado ' || status_row.status, 'status-' || status_row.position || '@test.local',
       '+5068888301' || status_row.position
  FROM unnest(ARRAY['pending_approval', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'])
       WITH ORDINALITY AS status_row(status, position);

INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
SELECT '00000000-0000-0000-0000-000000000a01', slot.starts_at, slot.starts_at + interval '1 hour',
       tstzrange(slot.starts_at, slot.starts_at + interval '75 minutes', '[)'), status_row.status,
       ('00000000-0000-0000-0000-000000003c0' || status_row.position)::uuid,
       '00000000-0000-0000-0000-000000003e01', 'Una por estado', true, 1000, 0
  FROM unnest(ARRAY['pending_approval', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'])
       WITH ORDINALITY AS status_row(status, position),
       LATERAL (SELECT timestamptz '2026-01-01 16:00+00' + (status_row.position * interval '1 day') AS starts_at) slot;

INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-03-10 16:00+00', '2026-03-10 17:00+00',
   tstzrange('2026-03-10 16:00+00', '2026-03-10 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000003ca1', '00000000-0000-0000-0000-000000003e01', 'Vieja', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-08-01 16:00+00', '2026-08-01 17:00+00',
   tstzrange('2026-08-01 16:00+00', '2026-08-01 17:15+00', '[)'), 'no_show',
   '00000000-0000-0000-0000-000000003ca1', '00000000-0000-0000-0000-000000003e01', 'Ausencia', false, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2027-09-01 16:00+00', '2027-09-01 17:00+00',
   tstzrange('2027-09-01 16:00+00', '2027-09-01 17:15+00', '[)'), 'confirmed',
   '00000000-0000-0000-0000-000000003ca1', '00000000-0000-0000-0000-000000003e01', 'Futura', false, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-05-15 16:00+00', '2026-05-15 17:00+00',
   tstzrange('2026-05-15 16:00+00', '2026-05-15 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000003ca2', '00000000-0000-0000-0000-000000003e01', 'De B', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-06-01 16:00+00', '2026-06-01 17:00+00',
   tstzrange('2026-06-01 16:00+00', '2026-06-01 17:15+00', '[)'), 'cancelled',
   '00000000-0000-0000-0000-000000003ca3', '00000000-0000-0000-0000-000000003e01', 'Cancelada de C', true, 1000, 0),
  ('00000000-0000-0000-0000-000000000a01', '2026-10-01 16:00+00', '2026-10-01 17:00+00',
   tstzrange('2026-10-01 16:00+00', '2026-10-01 17:15+00', '[)'), 'completed',
   NULL, NULL, NULL, NULL, NULL, NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000003ea9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id, last_appointment_at FROM public.scheduling_client_last_appointments()
     WHERE client_id IN ('00000000-0000-0000-0000-000000003ca1', '00000000-0000-0000-0000-000000003ca2',
                         '00000000-0000-0000-0000-000000003ca3')
     ORDER BY client_id$$,
  $$VALUES ('00000000-0000-0000-0000-000000003ca1'::uuid, '2027-09-01 16:00+00'::timestamptz),
           ('00000000-0000-0000-0000-000000003ca2'::uuid, '2026-05-15 16:00+00'::timestamptz),
           ('00000000-0000-0000-0000-000000003ca3'::uuid, '2026-06-01 16:00+00'::timestamptz)$$,
  'la última cita es la más reciente de cada clienta: gana la futura confirmada y cuenta la cancelada');

SELECT is(
  (SELECT count(*) FROM public.scheduling_client_last_appointments()
    WHERE client_id::text LIKE '00000000-0000-0000-0000-000000003c0%'),
  7::bigint, 'cada uno de los siete estados cuenta como cita');

SELECT is(
  (SELECT count(*) FROM public.scheduling_client_last_appointments()
    WHERE client_id = '00000000-0000-0000-0000-000000003ca4'),
  0::bigint, 'una clienta sin citas no tiene fila');

SELECT is(
  (SELECT count(*) FROM public.scheduling_client_last_appointments() WHERE client_id IS NULL),
  0::bigint, 'una cita sin clienta no es la última cita de nadie');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000003ea2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id, last_appointment_at FROM public.scheduling_client_last_appointments()$$,
  $$VALUES ('00000000-0000-0000-0000-000000003ca2'::uuid, '2026-05-15 16:00+00'::timestamptz)$$,
  'una clienta solo ve su propia última cita: la RLS oculta las de las demás');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT * FROM public.scheduling_client_last_appointments()$$, '42501', NULL,
  'un anónimo no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.scheduling_client_last_appointments()'::regprocedure),
  false, 'corre con los permisos de quien llama, así que la RLS de las citas sigue decidiendo');

SELECT ok(
  has_function_privilege('authenticated', 'public.scheduling_client_last_appointments()', 'EXECUTE'),
  'la usuaria autenticada tiene permiso de ejecución');

SELECT * FROM finish();
ROLLBACK;
