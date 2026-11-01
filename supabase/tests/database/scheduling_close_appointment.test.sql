-- US-AGE-12 · la administradora cierra una cita pasada: completada o ausencia.
-- Cobertura: cargo y descuento del anticipo en el ledger (criterios 3 y 7), servicio prestado distinto
-- (2), ausencia que pierde el anticipo (4), citas que no se pueden cerrar (1), evento en la bitácora (6)
-- y que una cita cerrada no vuelve a otro estado. Todo se deshace con ROLLBACK.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(29);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000c10', 'close-admin@test.local'),
  ('00000000-0000-0000-0000-000000000c11', 'close-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000c10';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-000000000cc1', '00000000-0000-0000-0000-000000000c11',
        'Clienta del cierre', 'close-clienta@test.local', '+50688880061');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000005e1', 'zz-test cierre reservada', 'lash_classic',
   35000, 25000, 60, 45, 15, 10000, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000005e2', 'zz-test cierre prestada', 'lash_classic',
   20000, 15000, 60, 45, 15, 5000, 'cuidados', true);

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-00000000c1a1', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '400 days 10 hours', now() - interval '400 days 9 hours',
   tstzrange(now() - interval '400 days 10 hours', now() - interval '400 days 9 hours'),
   '00000000-0000-0000-0000-000000000cc1', '00000000-0000-0000-0000-0000000005e1', 'zz-test cierre reservada',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000c1a2', '00000000-0000-0000-0000-000000000a01', 'confirmed',
   now() - interval '400 days 8 hours', now() - interval '400 days 7 hours',
   tstzrange(now() - interval '400 days 8 hours', now() - interval '400 days 7 hours'),
   '00000000-0000-0000-0000-000000000cc1', '00000000-0000-0000-0000-0000000005e1', 'zz-test cierre reservada',
   true, 35000, 10000, 0),
  ('00000000-0000-0000-0000-00000000c1a3', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '400 days 6 hours', now() - interval '400 days 5 hours',
   tstzrange(now() - interval '400 days 6 hours', now() - interval '400 days 5 hours'),
   '00000000-0000-0000-0000-000000000cc1', '00000000-0000-0000-0000-0000000005e1', 'zz-test cierre reservada',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000c1a4', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '400 days', now() + interval '400 days 1 hour',
   tstzrange(now() + interval '400 days', now() + interval '400 days 1 hour'),
   '00000000-0000-0000-0000-000000000cc1', '00000000-0000-0000-0000-0000000005e1', 'zz-test cierre reservada',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000c1a5', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() - interval '400 days 4 hours', now() - interval '400 days 3 hours',
   tstzrange(now() - interval '400 days 4 hours', now() - interval '400 days 3 hours'),
   '00000000-0000-0000-0000-000000000cc1', '00000000-0000-0000-0000-0000000005e1', 'zz-test cierre reservada',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000c1a6', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '400 days 2 hours', now() - interval '400 days 1 hour',
   tstzrange(now() - interval '400 days 2 hours', now() - interval '400 days 1 hour'),
   NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ('00000000-0000-0000-0000-00000000c1a7', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '401 days 10 hours', now() - interval '401 days 9 hours',
   tstzrange(now() - interval '401 days 10 hours', now() - interval '401 days 9 hours'),
   '00000000-0000-0000-0000-000000000cc1', '00000000-0000-0000-0000-0000000005e1', 'zz-test cierre reservada',
   true, 35000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000c1a8', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '401 days 8 hours', now() - interval '401 days 7 hours',
   tstzrange(now() - interval '401 days 8 hours', now() - interval '401 days 7 hours'),
   '00000000-0000-0000-0000-000000000cc1', '00000000-0000-0000-0000-0000000005e1', 'zz-test cierre reservada',
   true, 35000, 10000, 10000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c10","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT appointment_id, outcome, charge_amount, deposit_credit, amount_due, forfeited_deposit
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a1', 'completed')$$,
  $$VALUES ('00000000-0000-0000-0000-00000000c1a1'::uuid, 'completed', 35000::bigint, 10000::bigint, 25000::bigint, 0::bigint)$$,
  'completar una cita reservada: cargo del precio congelado, anticipo descontado, diferencia por pagar');

SELECT results_eq(
  $$SELECT status, closed_by, delivered_technique_name
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000c1a1'$$,
  $$VALUES ('completed', '00000000-0000-0000-0000-000000000c10'::uuid, 'zz-test cierre reservada')$$,
  'la cita queda completada, con quién la cerró y el servicio prestado');

SELECT isnt(
  (SELECT closed_at FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000c1a1'),
  NULL::timestamptz, 'la cita guarda cuándo se cerró');

SELECT results_eq(
  $$SELECT kind, amount FROM public.payments_ledger_entries
     WHERE appointment_id = '00000000-0000-0000-0000-00000000c1a1' ORDER BY kind$$,
  $$VALUES ('charge', 35000::bigint), ('deposit_credit', (-10000)::bigint)$$,
  'el ledger tiene el cargo y el crédito del anticipo, y el saldo de la cita es la diferencia');

SELECT results_eq(
  $$SELECT action, payload->>'amountDue', payload->>'previousStatus'
      FROM public.audit_events WHERE entity_id = '00000000-0000-0000-0000-00000000c1a1'$$,
  $$VALUES ('scheduling.appointment.completed', '25000', 'approved')$$,
  'el cierre deja su evento en la bitácora con el saldo y el estado anterior');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a1', 'completed')$$,
  'P0001', 'scheduling_appointment_not_closable', 'cerrar dos veces la misma cita se rechaza');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000c1a1'),
  2, 'cerrar dos veces no duplica los asientos');

SELECT results_eq(
  $$SELECT charge_amount, deposit_credit, amount_due
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a2', 'completed',
                                               '00000000-0000-0000-0000-0000000005e2')$$,
  $$VALUES (20000::bigint, 0::bigint, 20000::bigint)$$,
  'servicio prestado distinto: el cargo es el precio del servicio prestado, sin anticipo se debe todo');

SELECT results_eq(
  $$SELECT status, delivered_technique_id, delivered_technique_name
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000c1a2'$$,
  $$VALUES ('completed', '00000000-0000-0000-0000-0000000005e2'::uuid, 'zz-test cierre prestada')$$,
  'la cita guarda el servicio efectivamente prestado, distinto del reservado');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000c1a2'),
  1, 'sin anticipo registrado solo hay el asiento del cargo');

SELECT results_eq(
  $$SELECT outcome, charge_amount, deposit_credit, amount_due, forfeited_deposit
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a3', 'no_show')$$,
  $$VALUES ('no_show', 0::bigint, 0::bigint, 0::bigint, 10000::bigint)$$,
  'ausencia: sin cargo y el anticipo registrado se pierde');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000c1a3'),
  0, 'la ausencia no escribe asientos: perder el anticipo no mueve dinero');

SELECT results_eq(
  $$SELECT action, payload->>'forfeitedDeposit', payload->>'chargeAmount'
      FROM public.audit_events WHERE entity_id = '00000000-0000-0000-0000-00000000c1a3'$$,
  $$VALUES ('scheduling.appointment.no_show', '10000', '0')$$,
  'la ausencia deja en la bitácora el anticipo perdido');

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000c1a3'),
  'no_show', 'la cita queda con estado ausencia');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a4', 'completed')$$,
  'P0001', 'scheduling_appointment_not_closable', 'una cita que todavía no pasó no se cierra');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a5', 'no_show')$$,
  'P0001', 'scheduling_appointment_not_closable', 'una cita pendiente de aprobación no se cierra');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000cfff', 'completed')$$,
  'P0001', 'scheduling_appointment_not_closable', 'una cita que no existe no se cierra');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a6', 'completed')$$,
  'P0001', 'scheduling_appointment_not_chargeable', 'completar una cita sin clienta ni precio no genera cargo');

SELECT results_eq(
  $$SELECT outcome, forfeited_deposit
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a6', 'no_show')$$,
  $$VALUES ('no_show', 0::bigint)$$,
  'la ausencia de una cita sin clienta se puede cerrar sin anticipo que perder');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a7', 'cancelled')$$,
  'P0001', 'scheduling_close_outcome_invalid', 'solo se cierra como completada o ausencia');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a7', 'completed',
                                                      '00000000-0000-0000-0000-0000000005ff')$$,
  'P0001', 'scheduling_technique_not_available', 'un servicio prestado que no existe en el catálogo se rechaza');

SELECT results_eq(
  $$SELECT status, closed_at IS NULL,
           (SELECT count(*)::int FROM public.payments_ledger_entries
             WHERE appointment_id = '00000000-0000-0000-0000-00000000c1a7')
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000c1a7'$$,
  $$VALUES ('approved', true, 0)$$,
  'si el cierre falla, la cita sigue sin cerrar y sin asientos');

UPDATE public.scheduling_appointments SET status = 'approved'
 WHERE id = '00000000-0000-0000-0000-00000000c1a1';

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000c1a1'),
  'completed', 'staff no puede devolver una cita cerrada a otro estado');

UPDATE public.audit_events SET action = 'alterado'
 WHERE entity_id = '00000000-0000-0000-0000-00000000c1a1';

SELECT is(
  (SELECT action FROM public.audit_events WHERE entity_id = '00000000-0000-0000-0000-00000000c1a1'),
  'scheduling.appointment.completed', 'staff no puede alterar el evento del cierre en la bitácora');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c11","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a8', 'completed')$$,
  '42501', 'scheduling_not_staff', 'una clienta no puede cerrar citas');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c10","role":"authenticated"}', true);

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-00000000c1a8'),
  'approved', 'el intento de la clienta no cambió la cita');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000c1a8', 'completed')$$,
  '42501', NULL, 'anon no puede ejecutar el cierre');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE entity_id IN ('00000000-0000-0000-0000-00000000c1a1', '00000000-0000-0000-0000-00000000c1a2',
                        '00000000-0000-0000-0000-00000000c1a3', '00000000-0000-0000-0000-00000000c1a6')),
  4, 'cada cierre dejó exactamente un evento en la bitácora');

SELECT is(
  public.payments_client_balance('00000000-0000-0000-0000-000000000cc1'),
  45000::bigint, 'el saldo de la clienta es la suma de los asientos de sus cierres');

SELECT * FROM finish();
ROLLBACK;
