-- US-AGE-06 · la clienta cancela su cita; la ventana decide si se pierde el anticipo.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(38);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000b02', 'cancel-a@test.local'),
  ('00000000-0000-0000-0000-000000000b03', 'cancel-b@test.local'),
  ('00000000-0000-0000-0000-000000000b05', 'cancel-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000b05';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000b02',
   'Clienta A', 'cancel-a@test.local', '+50688880046'),
  ('00000000-0000-0000-0000-000000000bc7', '00000000-0000-0000-0000-000000000b03',
   'Clienta B', 'cancel-b@test.local', '+50688880047');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, decided_by, decided_at)
VALUES
  ('00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-000000000a01', 'approved',
   (now() + interval '30 days'), (now() + interval '30 days 1 hour'), tstzrange((now() + interval '30 days'), (now() + interval '30 days 1 hour')),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 10000, '00000000-0000-0000-0000-000000000b05', (now() - interval '1 day')),
  ('00000000-0000-0000-0000-00000000ca02', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '10 hours', now() + interval '11 hours',
   tstzrange(now() + interval '10 hours', now() + interval '11 hours'),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca03', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() + interval '13 hours', now() + interval '14 hours',
   tstzrange(now() + interval '13 hours', now() + interval '14 hours'),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca04', '00000000-0000-0000-0000-000000000a01', 'approved',
   (now() + interval '31 days'), (now() + interval '31 days 1 hour'), tstzrange((now() + interval '31 days'), (now() + interval '31 days 1 hour')),
   '00000000-0000-0000-0000-000000000bc7', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca05', '00000000-0000-0000-0000-000000000a01', 'rejected',
   (now() + interval '30 days'), (now() + interval '30 days 1 hour'), tstzrange((now() + interval '30 days'), (now() + interval '30 days 1 hour')),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca06', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '3 hours', now() - interval '2 hours',
   tstzrange(now() - interval '3 hours', now() - interval '2 hours'),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca07', '00000000-0000-0000-0000-000000000a01', 'approved',
   (now() + interval '32 days'), (now() + interval '32 days 1 hour'), tstzrange((now() + interval '32 days'), (now() + interval '32 days 1 hour')),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 10000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca08', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '20 hours', now() + interval '21 hours',
   tstzrange(now() + interval '20 hours', now() + interval '21 hours'),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 4000, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca09', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '22 hours', now() + interval '23 hours',
   tstzrange(now() + interval '22 hours', now() + interval '23 hours'),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 0, NULL, NULL),
  ('00000000-0000-0000-0000-00000000ca10', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '24 hours', now() + interval '25 hours',
   tstzrange(now() + interval '24 hours', now() + interval '25 hours'),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test cancelar',
   true, 35000, 10000, 10000, NULL, NULL);

-- Cita de paquete (US-AGE-04): la bitácora de cancelación debe nombrarla por su package_name.
INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, package_id, package_name,
   service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-00000000ca11', '00000000-0000-0000-0000-000000000a01', 'approved',
   (now() + interval '33 days'), (now() + interval '33 days 2 hours'),
   tstzrange((now() + interval '33 days'), (now() + interval '33 days 2 hours')),
   '00000000-0000-0000-0000-000000000bc6', '00000000-0000-0000-0000-00000000bb01', 'zz-test paquete cancelar',
   45000, 12000, 12000);

SELECT results_eq(
  $$SELECT cancellable, within_window, forfeited_deposit, window_hours
      FROM public.scheduling_evaluate_cancellation('approved', now() + interval '10 hours', 10000)$$,
  $$VALUES (true, false, 10000::bigint, 48)$$,
  'la regla: aprobada y con menos antelación que la ventana pierde el anticipo');

SELECT results_eq(
  $$SELECT cancellable, within_window, forfeited_deposit
      FROM public.scheduling_evaluate_cancellation('pending_approval', now() + interval '10 hours', 10000)$$,
  $$VALUES (true, false, 0::bigint)$$,
  'la regla: pendiente de aprobación no pierde el anticipo aunque cancele tarde');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca01', 0)$$,
  $$VALUES (true, 0::bigint)$$,
  'cancelar con más antelación que la ventana no pierde el anticipo');

SELECT is((SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000ca01'),
  'cancelled', 'la cita quedó cancelada');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.audit_events
            WHERE entity_id = '00000000-0000-0000-0000-00000000ca01'
              AND action = 'scheduling.appointment.cancelled'
              AND actor_id = '00000000-0000-0000-0000-000000000b02'), 1::bigint,
  'la cancelación quedó en la bitácora, con la clienta como actora');

SELECT is((SELECT payload->>'forfeitedDeposit' FROM public.audit_events
            WHERE entity_id = '00000000-0000-0000-0000-00000000ca01'), '0',
  'el evento dice que no se perdió anticipo');

SELECT is((SELECT (payload->>'withinWindow')::boolean FROM public.audit_events
            WHERE entity_id = '00000000-0000-0000-0000-00000000ca01'), true,
  'el evento dice que fue dentro de la ventana');

SELECT is((SELECT decided_by FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000ca01'),
  '00000000-0000-0000-0000-000000000b05'::uuid,
  'cancelar no pisa quién aprobó la cita');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, status, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', 'approved',
            (now() + interval '30 days'), (now() + interval '30 days 1 hour'),
            tstzrange((now() + interval '30 days'), (now() + interval '30 days 1 hour')))$$,
  'el espacio cancelado quedó libre para otra cita (criterio 4)');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca02', 10000)$$,
  $$VALUES (false, 10000::bigint)$$,
  'cancelar una aprobada fuera de la ventana pierde el anticipo congelado');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca03', 0)$$,
  $$VALUES (false, 0::bigint)$$,
  'cancelar una pendiente fuera de la ventana no pierde nada');

RESET ROLE;

SELECT is((SELECT payload->>'forfeitedDeposit' FROM public.audit_events
            WHERE entity_id = '00000000-0000-0000-0000-00000000ca02'), '10000',
  'el evento registra el anticipo perdido (criterio 6)');

SELECT is((SELECT payload->>'depositRequired' FROM public.audit_events
            WHERE entity_id = '00000000-0000-0000-0000-00000000ca02'), '10000',
  'el evento registra el anticipo congelado de la cita');

SELECT is((SELECT payload->>'previousStatus' FROM public.audit_events
            WHERE entity_id = '00000000-0000-0000-0000-00000000ca02'), 'approved',
  'el evento registra el estado que tenía la cita');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca08', 4000)$$,
  $$VALUES (false, 4000::bigint)$$,
  'si la clienta pagó menos que el requerido, solo pierde lo que el estudio registró');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca09', 0)$$,
  $$VALUES (false, 0::bigint)$$,
  'si no hay anticipo registrado, cancelar tarde no pierde nada aunque el requerido sea mayor');

RESET ROLE;

SELECT is((SELECT payload->>'depositRegistered' FROM public.audit_events
            WHERE entity_id = '00000000-0000-0000-0000-00000000ca08'), '4000',
  'el evento registra el anticipo registrado de la cita');

SELECT is((SELECT payload->>'forfeitedDeposit' FROM public.audit_events
            WHERE entity_id = '00000000-0000-0000-0000-00000000ca09'), '0',
  'el evento dice que no se perdió nada cuando no había anticipo registrado');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b02","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca04', 0)$$,
  'P0001', 'scheduling_appointment_not_cancellable',
  'una clienta no cancela la cita de otra');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca05', 0)$$,
  'P0001', 'scheduling_appointment_not_cancellable',
  'una cita rechazada no se cancela');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca06', 0)$$,
  'P0001', 'scheduling_appointment_not_cancellable',
  'una cita que ya pasó no se cancela');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca01', 0)$$,
  'P0001', 'scheduling_appointment_not_cancellable',
  'una cita ya cancelada no se cancela otra vez');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ffff', 0)$$,
  'P0001', 'scheduling_appointment_not_cancellable',
  'una cita inexistente da el mismo error que la de otra clienta');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_evaluate_cancellation('approved', now() + interval '1 day', 0)$$,
  '42501', NULL, 'la clienta no ejecuta la regla suelta que lee la política');

RESET ROLE;

SELECT is((SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000ca04'),
  'approved', 'la cita de la otra clienta quedó intacta');

SELECT is((SELECT count(*) FROM public.audit_events
            WHERE entity_id IN ('00000000-0000-0000-0000-00000000ca04', '00000000-0000-0000-0000-00000000ca05',
                                '00000000-0000-0000-0000-00000000ca06')), 0::bigint,
  'los intentos rechazados no dejaron eventos');

CREATE FUNCTION pg_temp.fail_cancel_audit() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'bitacora caida'; END; $$;

CREATE TRIGGER fail_cancel_audit BEFORE INSERT ON public.audit_events
  FOR EACH ROW WHEN (NEW.action = 'scheduling.appointment.cancelled')
  EXECUTE FUNCTION pg_temp.fail_cancel_audit();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b02","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca07', 0)$$,
  'P0001', 'bitacora caida',
  'si la bitácora falla, la cancelación falla');

RESET ROLE;

SELECT is((SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000ca07'),
  'approved', 'y la cita no queda cancelada sin su evento (misma transacción)');

DROP TRIGGER fail_cancel_audit ON public.audit_events;

UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 5;

SELECT results_eq(
  $$SELECT within_window, window_hours
      FROM public.scheduling_evaluate_cancellation('approved', now() + interval '10 hours', 10000)$$,
  $$VALUES (true, 5)$$,
  'la ventana configurada cambia el resultado sin tocar código');

UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 0;

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_evaluate_cancellation('confirmed', now() + interval '1 minute', 10000)$$,
  $$VALUES (true, 0::bigint)$$,
  'con ventana de cero horas nunca se pierde antes de que empiece la cita');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b05","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca07', 10000)$$,
  'P0001', 'scheduling_client_not_registered',
  'una administradora sin perfil de clienta no usa esta función');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca07', 10000)$$,
  '42501', NULL, 'un anónimo no ejecuta la cancelación');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.audit_events WHERE action = 'scheduling.appointment.cancelled'
            AND entity_id IN ('00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000ca02',
                              '00000000-0000-0000-0000-00000000ca03')), 3::bigint,
  'las tres cancelaciones válidas dejaron exactamente un evento cada una');

UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 48;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b02","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca10', 0)$$,
  'P0001', 'scheduling_cancellation_consequence_changed',
  'si la clienta vio que no perdía nada y ahora perdería el anticipo, no se cancela');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.audit_events WHERE entity_id = '00000000-0000-0000-0000-00000000ca10')
          + (SELECT count(*) FROM public.scheduling_appointments
              WHERE id = '00000000-0000-0000-0000-00000000ca10' AND status = 'approved'), 1::bigint,
  'la cita sigue aprobada y no quedó evento de una cancelación que no ocurrió');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b02","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca10', 10000)$$,
  $$VALUES (false, 10000::bigint)$$,
  'al confirmar de nuevo con la cifra correcta, cancela');

RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b02","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.scheduling_cancel_appointment('00000000-0000-0000-0000-00000000ca11', 0)$$,
  'cancela una cita de paquete igual que una de técnica');

RESET ROLE;

SELECT is(
  (SELECT payload ->> 'techniqueName' FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-00000000ca11'
      AND action = 'scheduling.appointment.cancelled'),
  'zz-test paquete cancelar',
  'la bitácora de la cancelación nombra el paquete, no deja el campo vacío');

SELECT * FROM finish();
ROLLBACK;
