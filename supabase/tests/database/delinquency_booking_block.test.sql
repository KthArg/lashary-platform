-- delinquency_booking_block.test.sql
-- US-MOR-02 · feature delinquency — ¿está bloqueada esta clienta para agendar? (contrato delinquency-api.md,
-- criterios 1 y 3, DOM-012). Solo bloquea una morosidad `active` cuya cita todavía tiene saldo en el ledger,
-- con el saldo de hoy y no con la foto de la detección; `pending_review`, `dismissed` y una `active` ya saldada
-- no bloquean; la más antigua sale primero; al saldarse la cita la clienta recupera el acceso sola. Responde
-- a la propia clienta y a la administradora, y a nadie más; anon no tiene EXECUTE (SEC-001, SEC-002).
-- Los asientos se escriben por payments_record_close_entries; todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'block-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'block-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000d1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-0000000000d2', 'Clienta con morosidades', 'cd01@test.local', '00000000031'),
  ('00000000-0000-0000-0000-00000000cd02', NULL, 'Otra clienta morosa', 'cd02@test.local', '00000000032'),
  ('00000000-0000-0000-0000-00000000cd03', NULL, 'Clienta sin morosidad', 'cd03@test.local', '00000000033');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

-- Ledger. a0d1 debe 25000 (sin anticipo). a0d2 está saldada (cargo 5000, anticipo 5000). a0d3 debe 30000.
-- a0d4 y a0d5 deben, pero su morosidad no está confirmada. a0d6 es de otra clienta.
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d1', 25000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d2', 5000, 5000);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d3', 30000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d4', 10000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d5', 8000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-00000000cd02', '00000000-0000-0000-0000-00000000a0d6', 7000, 0);

-- Morosidades. La de a0d1 guarda una foto de 99999 que NO es el saldo de hoy (25000).
INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d1', 99999, 'active',
   now() - interval '5 days', now(), '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d2', 5000, 'active',
   now() - interval '4 days', now(), '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d3', 30000, 'active',
   now() - interval '2 days', now(), '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d4', 10000, 'pending_review',
   now() - interval '1 day', NULL, NULL),
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d5', 8000, 'dismissed',
   now() - interval '3 days', now(), '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000cd02', '00000000-0000-0000-0000-00000000a0d6', 7000, 'active',
   now() - interval '1 day', now(), '00000000-0000-0000-0000-0000000000d1');

-- ── Como la administradora ─────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT appointment_id FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd01')$$,
  $$VALUES ('00000000-0000-0000-0000-00000000a0d1'::uuid), ('00000000-0000-0000-0000-00000000a0d3'::uuid)$$,
  'bloquean las activas con saldo, la más antigua primero');

SELECT is(
  (SELECT pending FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd01')
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0d1'),
  25000::bigint, 'el monto es el saldo de hoy en el ledger, no la foto que guardó la detección');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd01')
    WHERE appointment_id = '00000000-0000-0000-0000-00000000a0d2'),
  0, 'una morosidad activa cuya cita ya está saldada no bloquea');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd01')
    WHERE appointment_id IN ('00000000-0000-0000-0000-00000000a0d4', '00000000-0000-0000-0000-00000000a0d5')),
  0, 'una morosidad por revisar o descartada no bloquea aunque la cita deba');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd03'))
  + (SELECT count(*)::int FROM public.delinquency_booking_block(NULL)),
  0, 'una clienta sin morosidad, o un id nulo, no tiene bloqueo');

-- ── Recuperar el acceso es derivado: pagar la cita saca la fila sola ───────────
RESET ROLE;
INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
VALUES ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000a0d1', 'deposit_credit', -25000);
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT appointment_id FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd01')$$,
  $$VALUES ('00000000-0000-0000-0000-00000000a0d3'::uuid)$$,
  'al saldarse la cita deja de bloquear sin tocar ninguna tabla de morosidad; queda la otra');

-- ── Como la clienta ────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd01')),
  1, 'la clienta ve su propio bloqueo aunque no pueda leer la tabla ni el ledger');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd02')),
  0, 'la clienta no ve la morosidad de otra: vacío, sin error');

-- ── Como anon ──────────────────────────────────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cd01')$$,
  '42501', NULL, 'anon no puede preguntar si una clienta está bloqueada');

SELECT * FROM finish();
ROLLBACK;
