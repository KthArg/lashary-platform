-- delinquency_reject_regularization.test.sql
-- US-MOR-03 · delinquency — la administradora rechaza una regularización con un motivo obligatorio. No toca el
-- ledger ni la morosidad (sigue activa y bloqueando), la clienta ve el motivo en su estado de cuenta y puede
-- enviar otra solicitud, y el rechazo queda en la bitácora (DOM-011). Solo administradora. Todo se deshace
-- con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000018a1', 'rechazar-admin@test.local'),
  ('00000000-0000-0000-0000-0000000018a2', 'rechazar-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000018a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000018c2', '00000000-0000-0000-0000-0000000018a2', 'Clienta rechazar',
        'rechazar-clienta@test.local', '+50688891002');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000018a1","role":"authenticated"}', true);

SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000018c2', '00000000-0000-0000-0000-0000000018e1', 30000, 5000);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES ('00000000-0000-0000-0000-0000000018d1', '00000000-0000-0000-0000-0000000018c2', '00000000-0000-0000-0000-0000000018e1',
        25000, 'active', now() - interval '9 days', now(), '00000000-0000-0000-0000-0000000018a1');

INSERT INTO public.delinquency_regularizations (id, case_id, client_id, declared_amount, receipt_path, state)
VALUES
  ('00000000-0000-0000-0000-0000000018f1', '00000000-0000-0000-0000-0000000018d1', '00000000-0000-0000-0000-0000000018c2', 25000, '00000000-0000-0000-0000-0000000018c2/f1.jpg', 'pending_approval'),
  ('00000000-0000-0000-0000-0000000018f2', '00000000-0000-0000-0000-0000000018d1', '00000000-0000-0000-0000-0000000018c2', 20000, '00000000-0000-0000-0000-0000000018c2/f2.jpg', 'replaced');

INSERT INTO storage.objects (bucket_id, name)
VALUES ('delinquency-receipts', '00000000-0000-0000-0000-0000000018c2/f3.jpg');

SET LOCAL ROLE authenticated;

-- ── El motivo es obligatorio ───────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.delinquency_reject_regularization('00000000-0000-0000-0000-0000000018f1', NULL)$$,
  '22023', 'delinquency_rejection_reason_required', 'rechazar sin motivo se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_reject_regularization('00000000-0000-0000-0000-0000000018f1', '    ')$$,
  '22023', 'delinquency_rejection_reason_required', 'un motivo hecho solo de espacios no cuenta');

SELECT throws_ok(
  $$SELECT public.delinquency_reject_regularization('00000000-0000-0000-0000-0000000018f1', repeat('x', 501))$$,
  '22023', 'delinquency_rejection_reason_required', 'un motivo de más de 500 caracteres se rechaza');

SELECT throws_ok(
  $$SELECT public.delinquency_reject_regularization('00000000-0000-0000-0000-0000000018f1', '   Ilegible.   ')$$,
  '22023', 'delinquency_rejection_reason_required',
  'un motivo de menos de 10 caracteres, sin contar los espacios de los extremos, se rechaza (decisión de la clienta, 2026-11-18)');

-- ── Rechazar ───────────────────────────────────────────────────────────────────
SELECT lives_ok(
  $$SELECT public.delinquency_reject_regularization('00000000-0000-0000-0000-0000000018f1', '  El monto del comprobante no coincide  ')$$,
  'la administradora rechaza con un motivo');

RESET ROLE;
SELECT is(
  (SELECT state || '|' || rejection_reason || '|' || reviewed_by FROM public.delinquency_regularizations
    WHERE id = '00000000-0000-0000-0000-0000000018f1'),
  'rejected|El monto del comprobante no coincide|00000000-0000-0000-0000-0000000018a1',
  'la solicitud queda rechazada con el motivo sin espacios sobrantes y quién la revisó');

SELECT is(
  (SELECT state || '|' || (SELECT pending FROM public.payments_appointment_balances(ARRAY[appointment_id]))
     FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000018d1'),
  'active|25000', 'la morosidad sigue activa y la cita debe lo mismo: rechazar no toca el ledger');

SELECT is(
  (SELECT actor_id::text || '|' || (payload ->> 'reason') FROM public.audit_events
    WHERE action = 'delinquency.regularization.rejected' AND entity_id = '00000000-0000-0000-0000-0000000018f1'),
  '00000000-0000-0000-0000-0000000018a1|El monto del comprobante no coincide', 'el rechazo queda en la bitácora con su motivo');

SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.delinquency_reject_regularization('00000000-0000-0000-0000-0000000018f2', 'Ya no aplica')$$,
  '55000', 'delinquency_regularization_not_pending', 'una solicitud reemplazada no se rechaza');

-- ── La clienta ve el motivo y puede volver a enviar ────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000018a2","role":"authenticated"}', true);

SELECT is(
  (SELECT request_state || '|' || rejection_reason FROM public.delinquency_my_account()),
  'rejected|El monto del comprobante no coincide', 'la clienta ve en su estado de cuenta que se rechazó y por qué');

SELECT lives_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000018d1', 25000, NULL, '00000000-0000-0000-0000-0000000018c2/f3.jpg')$$,
  'tras el rechazo la clienta envía otro comprobante');

SELECT throws_ok(
  $$SELECT public.delinquency_reject_regularization('00000000-0000-0000-0000-0000000018f1', 'No soy admin')$$,
  '42501', 'delinquency_not_admin', 'la clienta no rechaza solicitudes');

-- ── La tabla repite el mínimo (auditoría del 2026-11-18, B3) ──────────────────────
RESET ROLE;
SELECT throws_ok(
  $$UPDATE public.delinquency_regularizations
       SET state = 'rejected', rejection_reason = 'Ilegible.', reviewed_by = '00000000-0000-0000-0000-0000000018a1', reviewed_at = now()
     WHERE id = '00000000-0000-0000-0000-0000000018f2'$$,
  '23514', NULL, 'ni escribiendo la tabla directo entra un rechazo con menos de 10 caracteres de motivo');

SELECT * FROM finish();
ROLLBACK;
