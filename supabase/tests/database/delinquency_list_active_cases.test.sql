-- delinquency_list_active_cases.test.sql
-- US-MOR-05 · feature delinquency — listado por caso de morosidades active (contrato
-- delinquency-api.md). A diferencia de delinquency_list_active (agrega por clienta), esta trae una
-- fila por caso para que la pantalla pueda actuar sobre una morosidad puntual, con el SALDO VIVO de la
-- cita (no la foto, A3) y lo condonado hasta ahora.
-- Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(7);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'listcases-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'listcases-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000b1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cb01', '00000000-0000-0000-0000-0000000000b2',
   'Clienta con dos casos', 'listcases-clienta@test.local', '00000000040');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

-- Tres cargos: dos con saldo vivo distinto del pending guardado (uno por un pago parcial directo al
-- ledger, simulando lo que hará US-MOR-03), uno saldado por completo (no debe salir).
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cb01', '00000000-0000-0000-0000-00000000c0e1', 12000, 0);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cb01', '00000000-0000-0000-0000-00000000c0e2', 8000, 0);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cb01', '00000000-0000-0000-0000-00000000c0e3', 4000, 0);

RESET ROLE;
-- Un pago directo al ledger (US-MOR-03 todavía no existe) baja el saldo vivo de c0e1 a 7000, distinto
-- del pending (12000) que guarda la morosidad.
INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
VALUES ('00000000-0000-0000-0000-00000000cb01', '00000000-0000-0000-0000-00000000c0e1', 'deposit_credit', -5000);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000e0001', '00000000-0000-0000-0000-00000000cb01',
   '00000000-0000-0000-0000-00000000c0e1', 12000, 'active',
   '2026-11-10T10:00:00Z', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000e0002', '00000000-0000-0000-0000-00000000cb01',
   '00000000-0000-0000-0000-00000000c0e2', 8000, 'active',
   '2026-11-11T10:00:00Z', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000e0003', '00000000-0000-0000-0000-00000000cb01',
   '00000000-0000-0000-0000-00000000c0e3', 4000, 'dismissed',
   '2026-11-09T10:00:00Z', '00000000-0000-0000-0000-0000000000b1');

UPDATE public.delinquency_cases SET detected_at = decided_at
 WHERE id IN ('00000000-0000-0000-0000-0000000e0001', '00000000-0000-0000-0000-0000000e0002',
              '00000000-0000-0000-0000-0000000e0003');

SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_list_active_cases(100)
    WHERE client_id = '00000000-0000-0000-0000-00000000cb01'),
  2, 'una fila por caso active, no agregada por clienta (los dos casos de la misma clienta salen)');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_list_active_cases(100) WHERE case_id = '00000000-0000-0000-0000-0000000e0003'),
  0, 'un caso dismissed no sale');

SELECT is(
  (SELECT case_id FROM public.delinquency_list_active_cases(100)
    WHERE client_id = '00000000-0000-0000-0000-00000000cb01' ORDER BY since DESC LIMIT 1),
  '00000000-0000-0000-0000-0000000e0002'::uuid, 'orden: de la más reciente a la más antigua');

SELECT is(
  (SELECT pending FROM public.delinquency_list_active_cases(100) WHERE case_id = '00000000-0000-0000-0000-0000000e0001'),
  7000::bigint, 'A3: pending es el saldo vivo de la cita (7000, tras el pago), no la foto guardada (12000)');

SELECT is(
  (SELECT exception_amount FROM public.delinquency_list_active_cases(100) WHERE case_id = '00000000-0000-0000-0000-0000000e0001'),
  NULL, 'exception_amount es null cuando nunca se condonó nada');

-- Cursor: después de la más reciente, sigue la que sigue (y no antes).
SELECT is(
  (SELECT case_id FROM public.delinquency_list_active_cases(
     1, '2026-11-11T10:00:00Z'::timestamptz, '00000000-0000-0000-0000-0000000e0002')),
  '00000000-0000-0000-0000-0000000e0001'::uuid, 'con el cursor de la primera fila, la siguiente es el otro caso active');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_list_active_cases(100)$$,
  '42501', NULL, 'anon no puede listar los casos activos');

SELECT * FROM finish();
ROLLBACK;
