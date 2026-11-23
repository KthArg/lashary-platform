BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000a6', 'recordatorio-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'recordatorio-levantada@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'recordatorio-condonada@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'recordatorio-parcial@test.local'),
  ('00000000-0000-0000-0000-0000000000b4', 'recordatorio-activa@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a6';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000ca61', '00000000-0000-0000-0000-0000000000b1', 'Levantada', 'recordatorio-levantada@test.local', '00000000061'),
  ('00000000-0000-0000-0000-00000000ca62', '00000000-0000-0000-0000-0000000000b2', 'Condonada', 'recordatorio-condonada@test.local', '00000000062'),
  ('00000000-0000-0000-0000-00000000ca63', '00000000-0000-0000-0000-0000000000b3', 'Parcial', 'recordatorio-parcial@test.local', '00000000063'),
  ('00000000-0000-0000-0000-00000000ca64', '00000000-0000-0000-0000-0000000000b4', 'Activa', 'recordatorio-activa@test.local', '00000000064');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);

SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000ca61', '00000000-0000-0000-0000-00000000b061', 12000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000ca62', '00000000-0000-0000-0000-00000000b062', 8000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000ca63', '00000000-0000-0000-0000-00000000b063', 12000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000ca64', '00000000-0000-0000-0000-00000000b064', 6000, 0);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000d6001', '00000000-0000-0000-0000-00000000ca61',
   '00000000-0000-0000-0000-00000000b061', 12000, 'active', now(), '00000000-0000-0000-0000-0000000000a6'),
  ('00000000-0000-0000-0000-0000000d6002', '00000000-0000-0000-0000-00000000ca62',
   '00000000-0000-0000-0000-00000000b062', 8000, 'active', now(), '00000000-0000-0000-0000-0000000000a6'),
  ('00000000-0000-0000-0000-0000000d6003', '00000000-0000-0000-0000-00000000ca63',
   '00000000-0000-0000-0000-00000000b063', 12000, 'active', now(), '00000000-0000-0000-0000-0000000000a6'),
  ('00000000-0000-0000-0000-0000000d6004', '00000000-0000-0000-0000-00000000ca64',
   '00000000-0000-0000-0000-00000000b064', 6000, 'active', now(), '00000000-0000-0000-0000-0000000000a6');

SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT state FROM public.delinquency_lift_case('00000000-0000-0000-0000-0000000d6001', 'error de registro')),
  'lifted', 'el bloqueo de una clienta se levanta a mano');

SELECT is(
  (SELECT state FROM public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d6002', 8000, 'se perdona todo')),
  'forgiven', 'la deuda de otra clienta se condona completa');

SELECT is(
  (SELECT state FROM public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d6003', 4000, 'condonación parcial')),
  'active', 'una condonación parcial deja el caso activo');

SELECT is(
  (SELECT array_agg(DISTINCT client_id ORDER BY client_id)
     FROM public.delinquency_list_active_cases(100, NULL, NULL)
    WHERE client_id IN (
      '00000000-0000-0000-0000-00000000ca61', '00000000-0000-0000-0000-00000000ca62',
      '00000000-0000-0000-0000-00000000ca63', '00000000-0000-0000-0000-00000000ca64')),
  ARRAY['00000000-0000-0000-0000-00000000ca63', '00000000-0000-0000-0000-00000000ca64']::uuid[],
  'criterio 4: de donde sale la lista del recordatorio, levantada y condonada no aparecen y la parcial y la activa sí');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_list_active_cases(100, NULL, NULL)
    WHERE client_id = '00000000-0000-0000-0000-00000000ca61'),
  0, 'criterio 4: una morosidad levantada no tiene ningún caso activo con saldo');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_list_active_cases(100, NULL, NULL)
    WHERE client_id = '00000000-0000-0000-0000-00000000ca62'),
  0, 'criterio 4: una morosidad condonada del todo no tiene ningún caso activo con saldo');

SELECT is(
  (SELECT sum(pending)::bigint FROM public.delinquency_list_active_cases(100, NULL, NULL)
    WHERE client_id = '00000000-0000-0000-0000-00000000ca63'),
  8000::bigint, 'con una condonación parcial el recordatorio pide el saldo de hoy, no el original');

SELECT is(
  (SELECT sum(pending)::bigint FROM public.delinquency_list_active_cases(100, NULL, NULL)
    WHERE client_id = '00000000-0000-0000-0000-00000000ca64'),
  6000::bigint, 'sin excepción, el recordatorio sigue pidiendo todo el saldo');

SELECT * FROM finish();
ROLLBACK;
