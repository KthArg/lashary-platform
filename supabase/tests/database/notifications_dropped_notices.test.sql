-- US-NOT-02 · un aviso que no se pudo registrar no tumba el cambio y queda anotado para reintentarlo.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000010a1', 'aviso-perdido-admin@test.local'),
  ('00000000-0000-0000-0000-0000000010a2', 'aviso-perdido-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000010a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-0000000010a2',
        'Clienta', 'aviso-perdido-clienta@test.local', '+50688880098');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-0000000010e1', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-10-07 15:00+00', '2047-10-07 16:00+00', tstzrange('2047-10-07 15:00+00', '2047-10-07 16:15+00'),
   '00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-0000000010f1', 'zz-test perdido',
   true, 35000, 10000, 10000);

SELECT lives_ok(
  $$INSERT INTO public.audit_events (id, actor_id, action, entity_type, entity_id, payload)
    VALUES ('00000000-0000-0000-0000-0000000010b1', '00000000-0000-0000-0000-0000000010a2',
            'scheduling.appointment.rescheduled', 'scheduling_appointment', '00000000-0000-0000-0000-0000000010e1',
            '{"previousStartsAt":"2047-10-07T15:00:00Z","newStartsAt":"no-es-fecha"}')$$,
  'un reagendado con el dato roto se guarda igual');

SELECT lives_ok(
  $$INSERT INTO public.audit_events (id, actor_id, action, entity_type, entity_id, payload)
    VALUES ('00000000-0000-0000-0000-0000000010b2', '00000000-0000-0000-0000-0000000010a2',
            'scheduling.appointment.cancelled', 'scheduling_appointment', '00000000-0000-0000-0000-0000000010e1',
            '{"startsAt":"no-es-fecha"}')$$,
  'una cancelación con el dato roto se guarda igual');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events WHERE id IN ('00000000-0000-0000-0000-0000000010b1', '00000000-0000-0000-0000-0000000010b2')),
  2, 'los dos eventos quedan en la bitácora');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE event_id IN ('00000000-0000-0000-0000-0000000010b1', '00000000-0000-0000-0000-0000000010b2')),
  0, 'no queda ningún aviso de esos eventos');

SELECT results_eq(
  $$SELECT event_id, action, appointment_id, error <> '' AS has_error, resolved_at IS NULL AS is_open
      FROM public.notifications_dropped_notices ORDER BY action$$,
  $$VALUES
    ('00000000-0000-0000-0000-0000000010b2'::uuid, 'scheduling.appointment.cancelled'::text, '00000000-0000-0000-0000-0000000010e1'::uuid, true, true),
    ('00000000-0000-0000-0000-0000000010b1'::uuid, 'scheduling.appointment.rescheduled'::text, '00000000-0000-0000-0000-0000000010e1'::uuid, true, true)$$,
  'cada aviso perdido queda anotado, con su evento y su error, sin resolver');

SELECT lives_ok(
  $$SELECT public.notifications_log_dropped_notice('00000000-0000-0000-0000-0000000010b1',
      'scheduling.appointment.rescheduled', '00000000-0000-0000-0000-0000000010e1', 'otra vez')$$,
  'anotar el mismo evento otra vez no falla');
SELECT is(
  (SELECT count(*)::int FROM public.notifications_dropped_notices WHERE event_id = '00000000-0000-0000-0000-0000000010b1'),
  1, 'el mismo evento deja una sola fila');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000010a1","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.notifications_dropped_notices), 2, 'staff lee los avisos perdidos');
SELECT lives_ok(
  $$UPDATE public.notifications_dropped_notices SET resolved_at = now() WHERE event_id = '00000000-0000-0000-0000-0000000010b1'$$,
  'staff marca uno como resuelto');
SELECT throws_ok(
  $$UPDATE public.notifications_dropped_notices SET error = 'otro' WHERE event_id = '00000000-0000-0000-0000-0000000010b1'$$,
  '42501', NULL, 'staff no cambia las demás columnas');
SELECT throws_ok(
  $$INSERT INTO public.notifications_dropped_notices (event_id, action, error)
    VALUES (gen_random_uuid(), 'scheduling.appointment.cancelled', 'x')$$,
  '42501', NULL, 'staff no inserta');
SELECT throws_ok($$DELETE FROM public.notifications_dropped_notices$$, '42501', NULL, 'staff no borra');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000010a2","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.notifications_dropped_notices), 0, 'la clienta no ve nada');

SELECT throws_ok(
  $$SELECT public.notifications_log_dropped_notice(gen_random_uuid(), 'scheduling.appointment.cancelled', NULL, 'x')$$,
  '42501', NULL, 'ni la clienta ni staff ejecutan la función que anota');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT count(*) FROM public.notifications_dropped_notices$$, '42501', NULL, 'anon no lee avisos perdidos');
SELECT throws_ok(
  $$SELECT public.notifications_log_dropped_notice(gen_random_uuid(), 'scheduling.appointment.cancelled', NULL, 'x')$$,
  '42501', NULL, 'anon no ejecuta la función que anota');

SELECT * FROM finish();
ROLLBACK;
