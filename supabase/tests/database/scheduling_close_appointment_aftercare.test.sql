BEGIN;
SELECT plan(19);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000c30', 'close-aftercare-admin@test.local'),
  ('00000000-0000-0000-0000-000000000c31', 'close-aftercare-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000c30';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-000000000c31',
        'Clienta de las indicaciones', 'close-aftercare-clienta@test.local', '+50688880063');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000005a1', 'zz-test cuidado A', 'lash_classic',
   35000, 25000, 60, 45, 15, 10000, 'texto de A', true),
  ('00000000-0000-0000-0000-0000000005a2', 'zz-test cuidado B', 'lash_classic',
   20000, 15000, 60, 45, 15, 5000, 'texto de B', true);

INSERT INTO public.catalog_packages (id, name, price, deposit, is_active)
VALUES ('00000000-0000-0000-0000-0000000009b1', 'zz-test paquete cuidado', 50000, 15000, true);

INSERT INTO public.catalog_package_techniques (package_id, technique_id) VALUES
  ('00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000005a1'),
  ('00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000005a2');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   package_id, package_name, is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-00000000e1a1', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '410 days 10 hours', now() - interval '410 days 9 hours',
   tstzrange(now() - interval '410 days 10 hours', now() - interval '410 days 9 hours'),
   '00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-0000000005a1', 'zz-test cuidado A',
   NULL, NULL, true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000e1a2', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '410 days 8 hours', now() - interval '410 days 7 hours',
   tstzrange(now() - interval '410 days 8 hours', now() - interval '410 days 7 hours'),
   '00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-0000000005a1', 'zz-test cuidado A',
   NULL, NULL, true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000e1a3', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '410 days 6 hours', now() - interval '410 days 5 hours',
   tstzrange(now() - interval '410 days 6 hours', now() - interval '410 days 5 hours'),
   '00000000-0000-0000-0000-000000000ce1', NULL, NULL,
   '00000000-0000-0000-0000-0000000009b1', 'zz-test paquete cuidado', NULL, 50000, 15000, 15000),
  ('00000000-0000-0000-0000-00000000e1a4', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '410 days 4 hours', now() - interval '410 days 3 hours',
   tstzrange(now() - interval '410 days 4 hours', now() - interval '410 days 3 hours'),
   '00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-0000000005a1', 'zz-test cuidado A',
   NULL, NULL, true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000e1a5', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '410 days 2 hours', now() - interval '410 days 1 hour',
   tstzrange(now() - interval '410 days 2 hours', now() - interval '410 days 1 hour'),
   '00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-0000000005a1', 'zz-test cuidado A',
   NULL, NULL, true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000e1a6', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '409 days 10 hours', now() - interval '409 days 9 hours',
   tstzrange(now() - interval '409 days 10 hours', now() - interval '409 days 9 hours'),
   '00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-0000000005a1', 'zz-test cuidado A',
   NULL, NULL, true, 35000, 10000, 10000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c30","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT outcome, aftercare_recorded
      FROM public.scheduling_close_appointment(
        '00000000-0000-0000-0000-00000000e1a1', 'completed', NULL, '  Evita el agua hoy  ')$$,
  $$VALUES ('completed', true)$$,
  'cerrar completada una cita de técnica devuelve aftercare_recorded verdadero');

SELECT results_eq(
  $$SELECT * FROM public.scheduling_close_appointment(
      '00000000-0000-0000-0000-00000000e1a2', 'completed', '00000000-0000-0000-0000-0000000005a2', NULL)$$,
  $$VALUES ('00000000-0000-0000-0000-00000000e1a2'::uuid, 'completed', 20000::bigint, 10000::bigint,
            10000::bigint, 0::bigint, true)$$,
  'con servicio prestado distinto el cierre devuelve el cobro de la técnica aplicada y las indicaciones guardadas');

SELECT results_eq(
  $$SELECT outcome, aftercare_recorded
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000e1a3', 'completed')$$,
  $$VALUES ('completed', true)$$,
  'cerrar completada una cita de paquete devuelve aftercare_recorded verdadero');

SELECT results_eq(
  $$SELECT outcome, aftercare_recorded
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000e1a4', 'completed')$$,
  $$VALUES ('completed', true)$$,
  'la llamada con solo tres parámetros sigue funcionando');

RESET ROLE;

SELECT results_eq(
  $$SELECT service_name, aftercare_text, client_note
      FROM public.notifications_aftercare_messages
     WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a1'$$,
  $$VALUES ('zz-test cuidado A', 'texto de A', 'Evita el agua hoy')$$,
  'las indicaciones guardan el servicio, el texto de la técnica y la nota recortada');

SELECT is(
  (SELECT aftercare_text FROM public.notifications_aftercare_messages
    WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a2'),
  'texto de B', 'con servicio prestado distinto se guarda el texto de la técnica aplicada, no el de la reservada');

SELECT ok(
  (SELECT aftercare_text ~~ '%texto de A%' AND aftercare_text ~~ '%texto de B%'
     FROM public.notifications_aftercare_messages
    WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a3'),
  'en una cita de paquete el texto trae las indicaciones de las técnicas del paquete');

SELECT is(
  (SELECT client_note FROM public.notifications_aftercare_messages
    WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a4'),
  NULL, 'sin nota la fila de indicaciones queda con client_note nulo');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c30","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment(
      '00000000-0000-0000-0000-00000000e1a5', 'no_show', NULL, 'No vino')$$,
  'P0001', 'scheduling_close_note_not_allowed',
  'una ausencia con nota se rechaza');

RESET ROLE;

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000e1a5'),
  'approved', 'el rechazo de la nota deja la cita sin cerrar');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c30","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT outcome, aftercare_recorded
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000e1a5', 'no_show', NULL, '   ')$$,
  $$VALUES ('no_show', false)$$,
  'una ausencia sin nota cierra y devuelve aftercare_recorded falso');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.notifications_aftercare_messages
    WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a5'),
  0, 'una ausencia no guarda indicaciones');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c30","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT outcome, aftercare_recorded
      FROM public.scheduling_close_appointment(
        '00000000-0000-0000-0000-00000000e1a6', 'completed', NULL, repeat('x', 1001))$$,
  $$VALUES ('completed', false)$$,
  'si notifications falla el cierre devuelve aftercare_recorded falso');

RESET ROLE;

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000e1a6'),
  'completed', 'si notifications falla la cita queda completada');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a6'),
  2, 'si notifications falla el cargo y el anticipo siguen en el ledger');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_aftercare_messages
    WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a6'),
  0, 'si notifications falla no queda fila de indicaciones');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE action = 'scheduling.aftercare.failed'
      AND entity_id = '00000000-0000-0000-0000-00000000e1a6'),
  1, 'si notifications falla queda el evento scheduling.aftercare.failed con el id de la cita');

SELECT is(
  (SELECT count(*)::int FROM pg_proc WHERE proname = 'scheduling_close_appointment'),
  1, 'existe una sola versión de scheduling_close_appointment');

SELECT ok(
  NOT has_function_privilege('anon', 'public.scheduling_close_appointment(uuid, text, uuid, text)', 'EXECUTE'),
  'anon no puede ejecutar el cierre');

SELECT * FROM finish();
ROLLBACK;
