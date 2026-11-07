-- US-NOT-08 · la clienta o la administradora confirman una cita aprobada.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(19);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000080b02', 'confirmar-a@test.local'),
  ('00000000-0000-0000-0000-000000080b03', 'confirmar-b@test.local'),
  ('00000000-0000-0000-0000-000000080b05', 'confirmar-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000080b05';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000080bc6', '00000000-0000-0000-0000-000000080b02',
   'Clienta A', 'confirmar-a@test.local', '+50688880801'),
  ('00000000-0000-0000-0000-000000080bc7', '00000000-0000-0000-0000-000000080b03',
   'Clienta B', 'confirmar-b@test.local', '+50688880802');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
SELECT seeds.id::uuid, '00000000-0000-0000-0000-000000000a01', seeds.status,
       now() + (seeds.hours || ' hours')::interval, now() + ((seeds.hours + 1) || ' hours')::interval,
       tstzrange(now() + (seeds.hours || ' hours')::interval, now() + ((seeds.hours + 1) || ' hours')::interval),
       '00000000-0000-0000-0000-000000080bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test confirmar',
       true, 35000, 10000, 8000
  FROM (VALUES
    ('00000000-0000-0000-0000-00000008ca01', 'approved',         1000),
    ('00000000-0000-0000-0000-00000008ca02', 'approved',         1010),
    ('00000000-0000-0000-0000-00000008ca03', 'pending_approval', 1020),
    ('00000000-0000-0000-0000-00000008ca04', 'cancelled',        1030),
    ('00000000-0000-0000-0000-00000008ca05', 'approved',         -5)
  ) AS seeds(id, status, hours);

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ca01')$$,
  '42501', NULL, 'anon no puede confirmar');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000080b03","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ca01')$$,
  'scheduling_appointment_not_confirmable', 'otra clienta recibe el mismo error que con una cita inexistente');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ffff')$$,
  'scheduling_appointment_not_confirmable', 'una cita inexistente no se confirma');

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000080b02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ca01')$$,
  $$VALUES ('00000000-0000-0000-0000-00000008ca01'::uuid, 48, 10000::bigint)$$,
  'la dueña confirma y recibe la ventana vigente y el anticipo requerido');

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ca01')$$,
  'confirmar dos veces no falla');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ca03')$$,
  'scheduling_appointment_not_confirmable', 'una cita pendiente de aprobación no se confirma');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ca04')$$,
  'scheduling_appointment_not_confirmable', 'una cita cancelada no se confirma');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ca05')$$,
  'scheduling_appointment_not_confirmable', 'una cita que ya empezó no se confirma');

SELECT is_empty(
  $$UPDATE public.scheduling_appointments SET status = 'confirmed'
     WHERE id = '00000000-0000-0000-0000-00000008ca02' RETURNING id$$,
  'la clienta no confirma con un UPDATE directo: la RLS no le deja tocar la fila');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000080b05","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_confirm_appointment('00000000-0000-0000-0000-00000008ca02')$$,
  'la administradora registra la confirmación de la clienta');

RESET ROLE;

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000008ca01'),
  'confirmed', 'la cita de la clienta queda confirmada');

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000008ca02'),
  'confirmed', 'la cita registrada por la administradora queda confirmada');

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000008ca03'),
  'pending_approval', 'la pendiente sigue pendiente');

SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
    WHERE action = 'scheduling.appointment.confirmed'
      AND entity_id = '00000000-0000-0000-0000-00000008ca01'),
  1, 'confirmar dos veces deja un solo evento');

SELECT results_eq(
  $$SELECT actor_id, payload->>'confirmedBy', payload->>'serviceName'
      FROM public.audit_events
     WHERE action = 'scheduling.appointment.confirmed'
       AND entity_id = '00000000-0000-0000-0000-00000008ca01'$$,
  $$VALUES ('00000000-0000-0000-0000-000000080b02'::uuid, 'client', 'zz-test confirmar')$$,
  'la bitácora guarda quién confirmó y el servicio');

SELECT isnt(
  (SELECT created_at FROM public.audit_events
    WHERE action = 'scheduling.appointment.confirmed'
      AND entity_id = '00000000-0000-0000-0000-00000008ca01'),
  NULL, 'la bitácora guarda la fecha y la hora');

SELECT is(
  (SELECT payload->>'confirmedBy' FROM public.audit_events
    WHERE action = 'scheduling.appointment.confirmed'
      AND entity_id = '00000000-0000-0000-0000-00000008ca02'),
  'staff', 'la bitácora distingue la confirmación manual');

SELECT is(
  (SELECT decided_by FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000008ca01'),
  NULL, 'confirmar no pisa quién decidió la cita');

SELECT function_privs_are(
  'public', 'scheduling_confirm_appointment', ARRAY['uuid'], 'anon', ARRAY[]::text[],
  'anon no tiene EXECUTE');

SELECT * FROM finish();
ROLLBACK;
