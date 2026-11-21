-- delinquency_regularizations.test.sql
-- US-MOR-03 · delinquency — el estado `settled` de una morosidad y la tabla de solicitudes de regularización:
-- cada estado exige sus campos, como mucho una solicitud pendiente por morosidad, solo staff lee (SEC-001) y
-- una clienta no ve las solicitudes de nadie, ni las de otra clienta (SEC-002). Nadie con sesión escribe la
-- tabla. Las filas se escriben como dueño de la tabla; todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000014a1', 'regul-admin@test.local'),
  ('00000000-0000-0000-0000-0000000014a2', 'regul-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000014a3', 'regul-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000014a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000014c2', '00000000-0000-0000-0000-0000000014a2', 'Clienta A', 'regul-clienta-a@test.local', '+50688887002'),
  ('00000000-0000-0000-0000-0000000014c3', '00000000-0000-0000-0000-0000000014a3', 'Clienta B', 'regul-clienta-b@test.local', '+50688887003');

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000014d1', '00000000-0000-0000-0000-0000000014c2', '00000000-0000-0000-0000-0000000014e1',
   25000, 'active', now() - interval '5 days', now(), '00000000-0000-0000-0000-0000000014a1'),
  ('00000000-0000-0000-0000-0000000014d2', '00000000-0000-0000-0000-0000000014c3', '00000000-0000-0000-0000-0000000014e2',
   10000, 'active', now() - interval '5 days', now(), '00000000-0000-0000-0000-0000000014a1');

-- ── El estado settled ──────────────────────────────────────────────────────────
SELECT lives_ok(
  $$UPDATE public.delinquency_cases SET state = 'settled', settled_at = now()
     WHERE id = '00000000-0000-0000-0000-0000000014d2'$$,
  'una morosidad confirmada puede quedar saldada, con la fecha en que se saldó');

SELECT throws_ok(
  $$UPDATE public.delinquency_cases SET state = 'settled', settled_at = NULL
     WHERE id = '00000000-0000-0000-0000-0000000014d1'$$,
  '23514', NULL, 'saldada sin fecha se rechaza');

SELECT throws_ok(
  $$UPDATE public.delinquency_cases SET settled_at = now()
     WHERE id = '00000000-0000-0000-0000-0000000014d1'$$,
  '23514', NULL, 'una morosidad activa no lleva fecha de saldada');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000014a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_client_states(ARRAY['00000000-0000-0000-0000-0000000014c3'::uuid])),
  0, 'el contrato no devuelve una morosidad saldada');

RESET ROLE;

-- ── Las solicitudes y sus estados ──────────────────────────────────────────────
INSERT INTO public.delinquency_regularizations (id, case_id, client_id, declared_amount, reference, receipt_path)
VALUES ('00000000-0000-0000-0000-0000000014f1', '00000000-0000-0000-0000-0000000014d1',
        '00000000-0000-0000-0000-0000000014c2', 25000, 'SINPE 1234', '00000000-0000-0000-0000-0000000014c2/f1.jpg');

SELECT is((SELECT state FROM public.delinquency_regularizations WHERE id = '00000000-0000-0000-0000-0000000014f1'),
  'pending_approval', 'una solicitud nace pendiente de aprobación');

SELECT throws_ok(
  $$INSERT INTO public.delinquency_regularizations (case_id, client_id, declared_amount, receipt_path)
    VALUES ('00000000-0000-0000-0000-0000000014d1', '00000000-0000-0000-0000-0000000014c2', 1000, 'x/f2.jpg')$$,
  '23505', NULL, 'una morosidad no puede tener dos solicitudes pendientes');

SELECT throws_ok(
  $$INSERT INTO public.delinquency_regularizations (case_id, client_id, declared_amount, receipt_path)
    VALUES ('00000000-0000-0000-0000-0000000014d2', '00000000-0000-0000-0000-0000000014c3', 0, 'x/f3.jpg')$$,
  '23514', NULL, 'lo declarado tiene que ser mayor que cero');

SELECT throws_ok(
  $$UPDATE public.delinquency_regularizations
       SET state = 'approved', approved_amount = 25000, reviewed_by = '00000000-0000-0000-0000-0000000014a1', reviewed_at = now()
     WHERE id = '00000000-0000-0000-0000-0000000014f1'$$,
  '23514', NULL, 'aprobada sin el asiento de pago se rechaza');

SELECT throws_ok(
  $$UPDATE public.delinquency_regularizations
       SET state = 'rejected', rejection_reason = '   ', reviewed_by = '00000000-0000-0000-0000-0000000014a1', reviewed_at = now()
     WHERE id = '00000000-0000-0000-0000-0000000014f1'$$,
  '23514', NULL, 'rechazada sin motivo se rechaza');

SELECT lives_ok(
  $$UPDATE public.delinquency_regularizations
       SET state = 'rejected', rejection_reason = 'El comprobante no se lee', reviewed_by = '00000000-0000-0000-0000-0000000014a1', reviewed_at = now()
     WHERE id = '00000000-0000-0000-0000-0000000014f1'$$,
  'rechazada con motivo y quién la revisó se guarda');

SELECT lives_ok(
  $$INSERT INTO public.delinquency_regularizations (case_id, client_id, declared_amount, receipt_path)
    VALUES ('00000000-0000-0000-0000-0000000014d1', '00000000-0000-0000-0000-0000000014c2', 25000, '00000000-0000-0000-0000-0000000014c2/f4.jpg')$$,
  'tras un rechazo la clienta puede enviar otra solicitud');

-- ── Quién lee y quién escribe ──────────────────────────────────────────────────
SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*)::int FROM public.delinquency_regularizations), 2,
  'la administradora ve las solicitudes');

SELECT throws_ok(
  $$UPDATE public.delinquency_regularizations SET declared_amount = 1$$,
  '42501', NULL, 'ni la administradora cambia una solicitud directo en la tabla');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000014a2","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.delinquency_regularizations), 0,
  'la clienta no lee la tabla directo, ni sus propias solicitudes');

SELECT throws_ok(
  $$INSERT INTO public.delinquency_regularizations (case_id, client_id, declared_amount, receipt_path)
    VALUES ('00000000-0000-0000-0000-0000000014d1', '00000000-0000-0000-0000-0000000014c2', 500, 'x/f5.jpg')$$,
  '42501', NULL, 'la clienta no inserta una solicitud directo en la tabla');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000014a3","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_regularizations
    WHERE client_id = '00000000-0000-0000-0000-0000000014c2'),
  0, 'otra clienta con sesión válida no ve las solicitudes de la clienta A');

SELECT * FROM finish();
ROLLBACK;
