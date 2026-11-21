-- payments_record_forgiveness_entry.test.sql
-- US-MOR-05 · feature payments — contra-asiento de condonación (contrato payments-api.md).
-- Un asiento negativo que baja el saldo; un monto cero o negativo se rechaza; dos condonaciones de la
-- misma cita conviven (condonación parcial, decisión de Kenny del 2026-11-18: no hay índice único que
-- las bloquee, como payment de US-MOR-03); nadie con sesión tiene EXECUTE, solo una función SECURITY
-- DEFINER puede llamarla (aquí se prueba con una función de prueba que imita ese patrón, como no existe
-- todavía delinquency_forgive_case).
-- Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'forgive-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'forgive-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-0000000000f2',
   'Clienta a condonar', 'forgive-clienta@test.local', '00000000020');

-- Función de prueba SECURITY DEFINER, mismo patrón que usará delinquency_forgive_case: solo así se
-- puede llamar a payments_record_forgiveness_entry, que no tiene EXECUTE para nadie con sesión.
CREATE FUNCTION pg_temp.test_forgive(p_client_id uuid, p_appointment_id uuid, p_amount bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.payments_record_forgiveness_entry(p_client_id, p_appointment_id, p_amount);
END;
$$;

-- request.jwt.claims alimenta auth.uid() (lo exige el trigger que sella created_by); el cambio de rol
-- llega después, igual que payments_unpaid_charges.test.sql: el cargo se registra antes.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a0f1', 10000, 0);

SET LOCAL ROLE authenticated;

-- Cargo de 10000, se condona 4000: saldo 6000.
SELECT is(
  pg_temp.test_forgive('00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a0f1', 4000),
  6000::bigint, 'condonar 4000 de un cargo de 10000 deja el saldo en 6000');

-- Segunda condonación de la misma cita: parcial, sigue conviviendo (saldo 6000 -> 2000).
SELECT is(
  pg_temp.test_forgive('00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a0f1', 4000),
  2000::bigint, 'una segunda condonación de la misma cita convive con la primera (condonación parcial)');

SELECT is(
  public.payments_client_balance('00000000-0000-0000-0000-00000000cf01'),
  2000::bigint, 'payments_client_balance refleja los dos asientos forgiveness_credit');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0f1' AND kind = 'forgiveness_credit'),
  2, 'quedan los dos asientos, cada uno de -4000');

SELECT throws_ok(
  $$SELECT pg_temp.test_forgive('00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a0f2', 0)$$,
  '22023', NULL, 'un monto cero se rechaza');

SELECT throws_ok(
  $$SELECT public.payments_record_forgiveness_entry(
      '00000000-0000-0000-0000-00000000cf01', '00000000-0000-0000-0000-00000000a0f3', 500)$$,
  '42501', NULL, 'nadie con sesión (ni staff) puede llamarla directo: no tiene EXECUTE');

SELECT * FROM finish();
ROLLBACK;
