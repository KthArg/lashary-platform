-- delinquency_approve_regularization.test.sql
-- US-MOR-03 · delinquency — la administradora aprueba una regularización (criterio 3): asienta el pago por el
-- monto que ella aprobó (puede ser distinto del declarado), marca la solicitud, salda la morosidad solo si la
-- cita queda en cero, y con eso la clienta puede volver a agendar. Todo en la misma transacción, con la
-- bitácora (DOM-011). Solo administradora. Asientos por payments_record_close_entries; todo se deshace con
-- ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(15);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000017a1', 'aprobar-admin@test.local'),
  ('00000000-0000-0000-0000-0000000017a2', 'aprobar-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000017a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000017c2', '00000000-0000-0000-0000-0000000017a2', 'Clienta aprobar',
        'aprobar-clienta@test.local', '+50688890002');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000017a1","role":"authenticated"}', true);

-- e1 debe 25000 y e2 debe 10000; las dos con morosidad activa.
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000017c2', '00000000-0000-0000-0000-0000000017e1', 30000, 5000);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000017c2', '00000000-0000-0000-0000-0000000017e2', 10000, 0);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000017d1', '00000000-0000-0000-0000-0000000017c2', '00000000-0000-0000-0000-0000000017e1',
   25000, 'active', now() - interval '9 days', now(), '00000000-0000-0000-0000-0000000017a1'),
  ('00000000-0000-0000-0000-0000000017d2', '00000000-0000-0000-0000-0000000017c2', '00000000-0000-0000-0000-0000000017e2',
   10000, 'active', now() - interval '8 days', now(), '00000000-0000-0000-0000-0000000017a1');

INSERT INTO public.delinquency_regularizations (id, case_id, client_id, declared_amount, receipt_path, state)
VALUES
  ('00000000-0000-0000-0000-0000000017f1', '00000000-0000-0000-0000-0000000017d1', '00000000-0000-0000-0000-0000000017c2', 25000, 'c2/f1.jpg', 'pending_approval'),
  ('00000000-0000-0000-0000-0000000017f2', '00000000-0000-0000-0000-0000000017d2', '00000000-0000-0000-0000-0000000017c2', 10000, 'c2/f2.jpg', 'pending_approval'),
  ('00000000-0000-0000-0000-0000000017f3', '00000000-0000-0000-0000-0000000017d2', '00000000-0000-0000-0000-0000000017c2', 9000, 'c2/f3.jpg', 'replaced');

SET LOCAL ROLE authenticated;

-- ── Aprobar todo: la morosidad queda saldada ───────────────────────────────────
SELECT is(public.delinquency_approve_regularization('00000000-0000-0000-0000-0000000017f1', 25000),
  'settled', 'aprobar el saldo completo deja la morosidad saldada');

RESET ROLE;
SELECT is(
  (SELECT state || '|' || approved_amount || '|' || reviewed_by FROM public.delinquency_regularizations
    WHERE id = '00000000-0000-0000-0000-0000000017f1'),
  'approved|25000|00000000-0000-0000-0000-0000000017a1', 'la solicitud queda aprobada con el monto y quién la revisó');

SELECT is(
  (SELECT e.amount FROM public.payments_ledger_entries e
     JOIN public.delinquency_regularizations r ON r.payment_entry_id = e.id
    WHERE r.id = '00000000-0000-0000-0000-0000000017f1'),
  -25000::bigint, 'el pago se asentó en el ledger y la solicitud apunta a ese asiento');

SELECT ok(
  (SELECT state = 'settled' AND settled_at IS NOT NULL FROM public.delinquency_cases
    WHERE id = '00000000-0000-0000-0000-0000000017d1'),
  'la morosidad queda saldada con su fecha');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-0000000017c2')
    WHERE appointment_id = '00000000-0000-0000-0000-0000000017e1'),
  0, 'esa cita ya no bloquea la agenda de la clienta');
SET LOCAL ROLE authenticated;

-- ── Un monto distinto del declarado: pago parcial ──────────────────────────────
SELECT is(public.delinquency_approve_regularization('00000000-0000-0000-0000-0000000017f2', 4000),
  'active', 'aprobar menos que el saldo deja la morosidad activa');

RESET ROLE;
SELECT is(
  (SELECT pending FROM public.payments_appointment_balances(ARRAY['00000000-0000-0000-0000-0000000017e2'::uuid])),
  6000::bigint, 'el pago parcial baja el saldo de la cita');

SELECT is(
  (SELECT (payload ->> 'declaredAmount') || '|' || (payload ->> 'approvedAmount') || '|' || (payload ->> 'pendingAfter')
     FROM public.audit_events
    WHERE action = 'delinquency.regularization.approved' AND entity_id = '00000000-0000-0000-0000-0000000017f2'),
  '10000|4000|6000', 'la bitácora guarda lo declarado, lo aprobado y lo que queda');

SELECT is(
  (SELECT actor_id FROM public.audit_events
    WHERE action = 'delinquency.regularization.approved' AND entity_id = '00000000-0000-0000-0000-0000000017f1'),
  '00000000-0000-0000-0000-0000000017a1'::uuid, 'la aprobación queda en la bitácora con la administradora como actor');
SET LOCAL ROLE authenticated;

-- ── Lo que no se aprueba ───────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.delinquency_approve_regularization('00000000-0000-0000-0000-0000000017f2', 4000)$$,
  '55000', 'delinquency_regularization_not_pending', 'una solicitud ya aprobada no se aprueba otra vez');

SELECT throws_ok(
  $$SELECT public.delinquency_approve_regularization('00000000-0000-0000-0000-0000000017f3', 1000)$$,
  '55000', 'delinquency_regularization_not_pending', 'una solicitud reemplazada no se aprueba');

SELECT throws_ok(
  $$SELECT public.delinquency_approve_regularization('00000000-0000-0000-0000-0000000017ff', 1000)$$,
  'P0002', 'delinquency_regularization_not_found', 'una solicitud que no existe');

RESET ROLE;
INSERT INTO public.delinquency_regularizations (id, case_id, client_id, declared_amount, receipt_path)
VALUES ('00000000-0000-0000-0000-0000000017f4', '00000000-0000-0000-0000-0000000017d2', '00000000-0000-0000-0000-0000000017c2', 6000, 'c2/f4.jpg');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.delinquency_approve_regularization('00000000-0000-0000-0000-0000000017f4', 6001)$$,
  '22023', 'delinquency_approved_amount_invalid', 'no se aprueba más que el saldo de hoy');

SELECT throws_ok(
  $$SELECT public.delinquency_approve_regularization('00000000-0000-0000-0000-0000000017f4', 0)$$,
  '22023', 'delinquency_approved_amount_invalid', 'no se aprueba un monto de cero');

-- ── Solo la administradora ─────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000017a2","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.delinquency_approve_regularization('00000000-0000-0000-0000-0000000017f4', 6000)$$,
  '42501', 'delinquency_not_admin', 'la clienta no aprueba su propia regularización');

SELECT * FROM finish();
ROLLBACK;
