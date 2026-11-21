-- delinquency_lift_and_forgive_case.test.sql
-- US-MOR-05 · feature delinquency — levantar (criterio 1) y condonar, total o parcial (criterio 2),
-- una morosidad `active`, con su bitácora (criterio 3) y sin borrar historial (criterio 4; contrato
-- delinquency-api.md). Condonar valida contra el saldo vivo de la cita, no contra la foto que guardó
-- la detección (A3 de la auditoría del 2026-11-18); condonar parcial no cierra el caso (A4).
-- Este repo no tiene un rol "staff" distinto de "admin" (auth_is_admin y auth_is_staff comprueban el
-- mismo rol) — el aislamiento se prueba contra clienta y anon, como el resto de las funciones de esta
-- feature (p. ej. delinquency_booking_block.test.sql).
-- Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(37);

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

-- Cuatro cargos cerrados, impagos: cuatro morosidades active con saldo distinto.
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a1', 12000, 0);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a2', 8000, 0);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a3', 5000, 0);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a4', 3000, 0);
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a5', 4000, 0);

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

-- ── Levantar (criterio 1) ───────────────────────────────────────────────────────
SELECT is(
  (SELECT state FROM public.delinquency_lift_case('00000000-0000-0000-0000-0000000d0001', 'error de registro')),
  'lifted', 'levantar una active la deja lifted');

SELECT is(
  public.payments_client_balance('00000000-0000-0000-0000-00000000ca01'),
  32000::bigint, 'levantar no toca el ledger: el saldo sigue siendo la suma de los cinco cargos');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0001'),
  1, 'criterio 4: la fila levantada sigue visible, no se borró');

SELECT is(
  (SELECT exception_reason FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0001'),
  'error de registro', 'criterio 3: el motivo queda guardado');

SELECT is(
  (SELECT (payload->>'pending')::bigint FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-0000000d0001' AND action = 'delinquency.case.lifted'),
  12000::bigint, 'criterio 3: el evento trae el monto (pending) en el payload');

SELECT is(
  (SELECT payload->>'reason' FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-0000000d0001' AND action = 'delinquency.case.lifted'),
  'error de registro', 'criterio 3: el evento trae el motivo en el payload');

SELECT ok(
  (SELECT created_at FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-0000000d0001' AND action = 'delinquency.case.lifted') <= now(),
  'criterio 3: el evento trae fecha');

-- ── Condonar parcial no cierra el caso (A4) ──────────────────────────────────────
SELECT is(
  (SELECT state FROM public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0002', 3000, 'pago parcial acordado')),
  'active', 'condonar parcial deja el caso active, no lo cierra');

SELECT is(
  (SELECT exception_amount FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0002'),
  3000::bigint, 'exception_amount guarda lo condonado hasta ahora');

SELECT is(
  (SELECT pending FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0002'),
  8000::bigint, 'criterio 4: pending original no se toca por una condonación parcial');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000ca01')
    WHERE appointment_id = '00000000-0000-0000-0000-00000000b0a2'),
  1, 'con saldo vivo (5000) todavía bloqueando, sigue active: delinquency_booking_block la sigue listando');

-- Segunda condonación sobre el mismo caso: satura el saldo vivo (5000 restantes) y cierra.
SELECT is(
  (SELECT state FROM public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0002', 5000, 'se perdona el resto')),
  'forgiven', 'condonar el resto del saldo vivo deja el caso forgiven');

SELECT is(
  (SELECT exception_amount FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0002'),
  8000::bigint, 'exception_amount acumula las dos condonaciones (3000 + 5000)');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000ca01')
    WHERE appointment_id = '00000000-0000-0000-0000-00000000b0a2'),
  0, 'criterio 1 contra US-MOR-02: forgiven ya no bloquea (delinquency_booking_block filtra state=active)');

-- now() es fija dentro de la transacción de la prueba: los dos eventos comparten created_at, así que se
-- distingue por el monto de esta condonación (amount), no por fecha.
SELECT is(
  (SELECT (payload->>'cumulativeAmount')::bigint FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-0000000d0002' AND action = 'delinquency.case.forgiven'
      AND payload->>'amount' = '5000'),
  8000::bigint, 'criterio 3: el evento de la segunda condonación trae el acumulado en el payload');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE entity_id = '00000000-0000-0000-0000-0000000d0002' AND action = 'delinquency.case.forgiven'),
  2, 'cada condonación deja su propio evento, ninguno se pierde');

-- ── Condonación total de una sola vez, demuestra el desbloqueo real (criterio 1 vía levantar ya probado arriba) ──
SELECT is(
  (SELECT state FROM public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0004', 3000, 'condonación total')),
  'forgiven', 'condonar el total de una sola vez deja forgiven');

-- ── Rechazos ──────────────────────────────────────────────────────────────────
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
  $$SELECT public.delinquency_lift_case('00000000-0000-0000-0000-00000000ca01'::uuid, '')$$,
  '22004', NULL, 'un motivo vacío se rechaza');

-- Caso nuevo para el motivo de solo espacio en blanco (B4) y para A3: pending guarda 100000 a propósito
-- (una foto vieja, mal calculada o desactualizada por un pago de US-MOR-03), bien distinto del saldo
-- vivo real (4000, el cargo de b0a5). El INSERT directo necesita salir de authenticated (sin política
-- de INSERT para esa tabla) y volver después.
RESET ROLE;
INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, decided_at, decided_by)
VALUES ('00000000-0000-0000-0000-0000000d0005', '00000000-0000-0000-0000-00000000ca01',
   '00000000-0000-0000-0000-00000000b0a5', 100000, 'active', now(), '00000000-0000-0000-0000-0000000000a1');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format('SELECT public.delinquency_lift_case(%L, %L)', '00000000-0000-0000-0000-0000000d0005', E' \n\t '),
  '22004', NULL, 'B4: un motivo de solo espacio en blanco (incluye salto de línea) se rechaza, no solo btrim()');

SELECT throws_ok(
  format('SELECT public.delinquency_forgive_case(%L, 1000, %L)', '00000000-0000-0000-0000-0000000d0005', E'\n'),
  '22004', NULL, 'B4: lo mismo en delinquency_forgive_case');

SELECT throws_ok(
  $$SELECT public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0005', 0, 'motivo')$$,
  '22023', NULL, 'un monto cero se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0005', -100, 'motivo')$$,
  '22023', NULL, 'un monto negativo se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0005', 50000, 'motivo')$$,
  '22023', NULL, 'A3: 50000 es menor que el pending guardado (100000) pero mayor que el saldo vivo real (4000) — se rechaza, ya no valida contra la foto');

SELECT is(
  (SELECT state FROM public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0005', 4000, 'motivo')),
  'forgiven', 'A3: condonar exactamente el saldo vivo (4000, no los 100000 de la foto) satura y cierra');

-- ── N1: condonar parcial, pagar el resto con una regularización de US-MOR-03, y queda settled ────
-- Antes de esta corrección, delinquency_cases_state_check y las dos exception_*_by_state no tenían
-- rama para 'settled' (lo agregó US-MOR-03, ya en main): delinquency_approve_regularization violaba
-- el CHECK apenas intentaba dejar la morosidad en settled. Caso nuevo: un cargo de 10000, se condona
-- 6000 (queda active, exception_amount = 6000) y se paga el resto (4000) con una regularización
-- aprobada, que debe dejarlo settled sin perder lo ya condonado.
RESET ROLE;
SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000ca01', '00000000-0000-0000-0000-00000000b0a6', 10000, 0);
INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, decided_at, decided_by)
VALUES ('00000000-0000-0000-0000-0000000d0006', '00000000-0000-0000-0000-00000000ca01',
   '00000000-0000-0000-0000-00000000b0a6', 10000, 'active', now(), '00000000-0000-0000-0000-0000000000a1');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT state FROM public.delinquency_forgive_case(
    '00000000-0000-0000-0000-0000000d0006', 6000, 'condonación parcial antes de saldar')),
  'active', 'N1: condonar 6000 de 10000 deja el caso active, con el resto todavía por pagar');

RESET ROLE;
INSERT INTO storage.objects (bucket_id, name)
VALUES ('delinquency-receipts', '00000000-0000-0000-0000-00000000ca01/n1-receipt.jpg');
SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

CREATE TEMP TABLE n1_request AS
  SELECT public.delinquency_submit_regularization(
    '00000000-0000-0000-0000-0000000d0006', 4000, 'pago del resto',
    '00000000-0000-0000-0000-00000000ca01/n1-receipt.jpg') AS id;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT lives_ok(
  format('SELECT public.delinquency_approve_regularization(%L, 4000)', (SELECT id FROM n1_request)),
  'N1: aprobar el pago que salda la cita ya no viola el CHECK de estado ni el de excepción por estado');

SELECT is(
  (SELECT state FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0006'),
  'settled', 'N1: la morosidad queda settled al quedar la cita en cero');

SELECT is(
  (SELECT exception_amount FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0006'),
  6000::bigint, 'N1: settled conserva lo ya condonado (exception_amount), no lo pierde ni lo exige vacío');

SELECT is(
  (SELECT exception_reason FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0006'),
  'condonación parcial antes de saldar', 'N1: settled conserva también el motivo de la condonación parcial');

-- ── Aislamiento por rol (SEC-002) ─────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.delinquency_lift_case('00000000-0000-0000-0000-0000000d0005', 'motivo')$$,
  '42501', NULL, 'una clienta no puede levantar una morosidad, ni la suya propia');

SELECT throws_ok(
  $$SELECT public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0005', 1000, 'motivo')$$,
  '42501', NULL, 'una clienta no puede condonar una morosidad, ni la suya propia');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.delinquency_lift_case('00000000-0000-0000-0000-0000000d0005', 'motivo')$$,
  '42501', NULL, 'anon no tiene EXECUTE sobre delinquency_lift_case');

SELECT throws_ok(
  $$SELECT public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0005', 1000, 'motivo')$$,
  '42501', NULL, 'anon no tiene EXECUTE sobre delinquency_forgive_case');

SELECT * FROM finish();
ROLLBACK;
