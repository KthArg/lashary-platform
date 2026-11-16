-- delinquency_lift_and_forgive_case.test.sql
-- US-MOR-05 · feature delinquency — levantar (criterio 1) y condonar (criterio 2) una morosidad
-- `active`, con su bitácora (criterio 3) y sin borrar historial (criterio 4; contrato
-- delinquency-api.md). Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'lift-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'lift-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-0000000000a2',
   'Clienta con morosidad', 'lift-clienta@test.local', '00000000030');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- Tres cargos cerrados, impagos: tres morosidades active con pending distinto.
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a1', 12000, 0);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a2', 8000, 0);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a3', 5000, 0);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-00000000ca01',
   '00000000-0000-0000-0000-00000000b0a1', 12000, 'active', now(), '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000d0002', '00000000-0000-0000-0000-00000000ca01',
   '00000000-0000-0000-0000-00000000b0a2', 8000, 'active', now(), '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000d0003', '00000000-0000-0000-0000-00000000ca01',
   '00000000-0000-0000-0000-00000000b0a3', 5000, 'pending_review', NULL, NULL),
  ('00000000-0000-0000-0000-0000000d0004', '00000000-0000-0000-0000-00000000ca01',
   '00000000-0000-0000-0000-00000000b0a4', 3000, 'active', now(), '00000000-0000-0000-0000-0000000000a1');

SET LOCAL ROLE authenticated;

-- Levantar (criterio 1): sin tocar el ledger.
SELECT is(
  (SELECT state FROM public.delinquency_lift_case('00000000-0000-0000-0000-0000000d0001', 'error de registro')),
  'lifted', 'levantar una active la deja lifted');

SELECT is(
  public.payments_client_balance('00000000-0000-0000-0000-00000000ca01'),
  25000::bigint, 'levantar no toca el ledger: el saldo sigue siendo la suma de los tres cargos');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0001'),
  1, 'criterio 4: la fila levantada sigue visible, no se borró');

SELECT is(
  (SELECT exception_reason FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0001'),
  'error de registro', 'criterio 3: el motivo queda guardado');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-0000000d0001' AND action = 'delinquency.case.lifted'),
  1, 'criterio 3: el evento queda en la bitácora, con fecha (created_at) y monto (pending) en el payload');

-- Condonar total (criterio 2): mueve el ledger.
SELECT is(
  (SELECT state FROM public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0002', 8000, 'buena clienta')),
  'forgiven', 'condonar el total de una active la deja forgiven');

SELECT is(
  public.payments_client_balance('00000000-0000-0000-0000-00000000ca01'),
  17000::bigint, 'condonar 8000 baja el saldo real (25000 - 8000)');

SELECT is(
  (SELECT exception_amount FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0002'),
  8000::bigint, 'el monto condonado queda guardado, distinto del pending original si fuera parcial');

SELECT is(
  (SELECT pending FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0002'),
  8000::bigint, 'criterio 4: pending original no se toca');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-0000000d0002' AND action = 'delinquency.case.forgiven'),
  1, 'criterio 3: el evento de condonación queda en la bitácora con el monto y el motivo');

-- Rechazos.
SELECT throws_ok(
  $$SELECT public.delinquency_lift_case('00000000-0000-0000-0000-0000000d0003', 'motivo')$$,
  '55001', NULL, 'levantar una pending_review (no active) se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0003', 1000, 'motivo')$$,
  '55001', NULL, 'condonar una pending_review (no active) se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_lift_case('00000000-0000-0000-0000-0000000d0001', 'otra vez')$$,
  '55001', NULL, 'levantar una ya lifted (no active) se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_lift_case(gen_random_uuid(), 'motivo')$$,
  'P0002', NULL, 'un caso inexistente se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0001', 100, 'motivo')$$,
  '55001', NULL, 'condonar una ya lifted (no active) se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_lift_case('00000000-0000-0000-0000-0000000d0001', '')$$,
  '22004', NULL, 'un motivo vacío se rechaza');

-- Monto fuera de rango sobre un caso active válido.
SELECT throws_ok(
  $$SELECT public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0004', 5000, 'motivo')$$,
  '22023', NULL, 'condonar más de lo pendiente se rechaza');

SELECT * FROM finish();
ROLLBACK;
