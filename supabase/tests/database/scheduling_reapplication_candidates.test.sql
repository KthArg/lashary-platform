BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000001eb1', 'reap-a@test.local'),
  ('00000000-0000-0000-0000-000000001eb2', 'reap-b@test.local'),
  ('00000000-0000-0000-0000-000000001eb3', 'reap-c@test.local'),
  ('00000000-0000-0000-0000-000000001eb5', 'reap-e@test.local'),
  ('00000000-0000-0000-0000-000000001eb9', 'reap-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000001eb9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000001cb1', '00000000-0000-0000-0000-000000001eb1',
   'Clienta A', 'reap-a@test.local', '+50688882001'),
  ('00000000-0000-0000-0000-000000001cb2', '00000000-0000-0000-0000-000000001eb2',
   'Clienta B', 'reap-b@test.local', '+50688882002'),
  ('00000000-0000-0000-0000-000000001cb3', '00000000-0000-0000-0000-000000001eb3',
   'Clienta C', 'reap-c@test.local', '+50688882003'),
  ('00000000-0000-0000-0000-000000001cb5', '00000000-0000-0000-0000-000000001eb5',
   'Clienta E', 'reap-e@test.local', '+50688882005');

-- Clienta A: una técnica completada, candidata; otra técnica en ausencia, no cuenta.
INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required,
   delivered_technique_id, delivered_technique_name)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-09-01 16:00+00', '2026-09-01 17:00+00',
   tstzrange('2026-09-01 16:00+00', '2026-09-01 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001cb1', '00000000-0000-0000-0000-000000001f01', 'Clásico', true, 1000, 0,
   '00000000-0000-0000-0000-000000001f01', 'Clásico'),
  ('00000000-0000-0000-0000-000000000a01', '2026-09-10 16:00+00', '2026-09-10 17:00+00',
   tstzrange('2026-09-10 16:00+00', '2026-09-10 17:15+00', '[)'), 'no_show',
   '00000000-0000-0000-0000-000000001cb1', '00000000-0000-0000-0000-000000001f02', 'Laminado', false, 1000, 0,
   NULL, NULL);

-- Clienta B: técnica completada, pero tiene una cita futura pendiente de OTRA técnica — cualquier
-- técnica futura descarta el aviso (decisión del líder del proyecto, 2026-11-13).
INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required,
   delivered_technique_id, delivered_technique_name)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-09-01 16:00+00', '2026-09-01 17:00+00',
   tstzrange('2026-09-01 16:00+00', '2026-09-01 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001cb2', '00000000-0000-0000-0000-000000001f01', 'Clásico', true, 1000, 0,
   '00000000-0000-0000-0000-000000001f01', 'Clásico'),
  ('00000000-0000-0000-0000-000000000a01', '2027-06-01 16:00+00', '2027-06-01 17:00+00',
   tstzrange('2027-06-01 16:00+00', '2027-06-01 17:15+00', '[)'), 'pending_approval',
   '00000000-0000-0000-0000-000000001cb2', '00000000-0000-0000-0000-000000001f02', 'Laminado', false, 1000, 0,
   NULL, NULL);

-- Clienta C: dos citas completadas de la misma técnica — gana la más reciente.
INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required,
   delivered_technique_id, delivered_technique_name)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-06-01 16:00+00', '2026-06-01 17:00+00',
   tstzrange('2026-06-01 16:00+00', '2026-06-01 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001cb3', '00000000-0000-0000-0000-000000001f01', 'Clásico', true, 1000, 0,
   '00000000-0000-0000-0000-000000001f01', 'Clásico'),
  ('00000000-0000-0000-0000-000000000a01', '2026-09-15 16:00+00', '2026-09-15 17:00+00',
   tstzrange('2026-09-15 16:00+00', '2026-09-15 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001cb3', '00000000-0000-0000-0000-000000001f01', 'Clásico', false, 1000, 0,
   '00000000-0000-0000-0000-000000001f01', 'Clásico');

-- Clienta D (sin cuenta, solo en la cita): paquete completado — no entra, no tiene técnica propia.
INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, package_id, package_name, service_price, deposit_required)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-09-01 16:00+00', '2026-09-01 17:00+00',
   tstzrange('2026-09-01 16:00+00', '2026-09-01 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001cb1', '00000000-0000-0000-0000-000000002f01', 'Set + diseño', 2000, 0);

-- Clienta E: técnica completada y una cita futura CANCELADA — no descarta el aviso.
INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required,
   delivered_technique_id, delivered_technique_name)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-09-01 16:00+00', '2026-09-01 17:00+00',
   tstzrange('2026-09-01 16:00+00', '2026-09-01 17:15+00', '[)'), 'completed',
   '00000000-0000-0000-0000-000000001cb5', '00000000-0000-0000-0000-000000001f01', 'Clásico', true, 1000, 0,
   '00000000-0000-0000-0000-000000001f01', 'Clásico'),
  ('00000000-0000-0000-0000-000000000a01', '2027-06-01 16:00+00', '2027-06-01 17:00+00',
   tstzrange('2027-06-01 16:00+00', '2027-06-01 17:15+00', '[)'), 'cancelled',
   '00000000-0000-0000-0000-000000001cb5', '00000000-0000-0000-0000-000000001f02', 'Laminado', false, 1000, 0,
   NULL, NULL);

-- Cita completada sin clienta (bloqueo del personal): no es candidata de nadie.
INSERT INTO public.scheduling_appointments
  (resource_id, starts_at, ends_at, occupied_range, status,
   client_id, technique_id, technique_name, is_first_time, service_price, deposit_required,
   delivered_technique_id, delivered_technique_name)
VALUES
  ('00000000-0000-0000-0000-000000000a01', '2026-09-01 16:00+00', '2026-09-01 17:00+00',
   tstzrange('2026-09-01 16:00+00', '2026-09-01 17:15+00', '[)'), 'completed',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000001eb9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id, technique_id, last_completed_at
      FROM public.scheduling_reapplication_candidates()
     WHERE client_id = '00000000-0000-0000-0000-000000001cb1'$$,
  $$VALUES ('00000000-0000-0000-0000-000000001cb1'::uuid, '00000000-0000-0000-0000-000000001f01'::uuid,
            '2026-09-01 17:00+00'::timestamptz)$$,
  'la clienta A es candidata con su técnica completada; la ausencia de la otra técnica no cuenta');

SELECT results_eq(
  $$SELECT client_id, technique_id, last_completed_at
      FROM public.scheduling_reapplication_candidates()
     WHERE client_id = '00000000-0000-0000-0000-000000001cb3'$$,
  $$VALUES ('00000000-0000-0000-0000-000000001cb3'::uuid, '00000000-0000-0000-0000-000000001f01'::uuid,
            '2026-09-15 17:00+00'::timestamptz)$$,
  'con dos citas completadas de la misma técnica gana la más reciente');

SELECT is(
  (SELECT count(*) FROM public.scheduling_reapplication_candidates()
    WHERE client_id = '00000000-0000-0000-0000-000000001cb2'),
  0::bigint,
  'la clienta B queda fuera: tiene una cita futura pendiente, aunque sea de otra técnica');

SELECT results_eq(
  $$SELECT client_id, technique_id, last_completed_at
      FROM public.scheduling_reapplication_candidates()
     WHERE client_id = '00000000-0000-0000-0000-000000001cb5'$$,
  $$VALUES ('00000000-0000-0000-0000-000000001cb5'::uuid, '00000000-0000-0000-0000-000000001f01'::uuid,
            '2026-09-01 17:00+00'::timestamptz)$$,
  'la clienta E sigue siendo candidata: su cita futura está cancelada, no descarta el aviso');

SELECT is(
  (SELECT count(*) FROM public.scheduling_reapplication_candidates()
    WHERE technique_id = '00000000-0000-0000-0000-000000001f02'),
  0::bigint,
  'una técnica solo marcada como ausencia (no_show) no genera candidatura');

SELECT is(
  (SELECT count(*) FROM public.scheduling_reapplication_candidates()
    WHERE client_id IS NULL),
  0::bigint,
  'una cita completada sin clienta (bloqueo del personal) no es candidata de nadie');

SELECT is(
  (SELECT count(*) FROM public.scheduling_reapplication_candidates()
    WHERE technique_id = '00000000-0000-0000-0000-000000002f01'::uuid),
  0::bigint,
  'un paquete completado no entra: no tiene una sola técnica (alcance del criterio 1)');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000001eb1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id FROM public.scheduling_reapplication_candidates()$$,
  $$VALUES ('00000000-0000-0000-0000-000000001cb1'::uuid)$$,
  'una clienta solo ve su propia candidatura: la RLS oculta las de las demás');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT * FROM public.scheduling_reapplication_candidates()$$, '42501', NULL,
  'un anónimo no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.scheduling_reapplication_candidates()'::regprocedure),
  false, 'corre con los permisos de quien llama, así que la RLS de las citas sigue decidiendo');

SELECT * FROM finish();
ROLLBACK;
