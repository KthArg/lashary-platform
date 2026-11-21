-- delinquency_submit_regularization.test.sql
-- US-MOR-03 · delinquency — la clienta envía su regularización (criterios 1 y 2) y consulta su estado de
-- cuenta (criterio 4). Solo sobre una morosidad `active` propia, con lo declarado entre 1 y el saldo de hoy,
-- con un comprobante ya subido en su carpeta y sin usar; reenviar con una pendiente la reemplaza; cada envío
-- queda en la bitácora. El estado de cuenta responde solo por la sesión (SEC-002).
-- Asientos por payments_record_close_entries; todo se deshace con ROLLBACK y no se usa la service-role key.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000016a1', 'envio-admin@test.local'),
  ('00000000-0000-0000-0000-0000000016a2', 'envio-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000016a3', 'envio-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000016a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000016c2', '00000000-0000-0000-0000-0000000016a2', 'Clienta A', 'envio-clienta-a@test.local', '+50688889002'),
  ('00000000-0000-0000-0000-0000000016c3', '00000000-0000-0000-0000-0000000016a3', 'Clienta B', 'envio-clienta-b@test.local', '+50688889003');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000016a1","role":"authenticated"}', true);

-- A: e1 debe 25000 (activa), e2 debe 8000 (por revisar), e3 quedó en cero (activa, ya pagada).
-- B: e4 debe 10000 (activa).
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000016c2', '00000000-0000-0000-0000-0000000016e1', 30000, 5000);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000016c2', '00000000-0000-0000-0000-0000000016e2', 8000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000016c2', '00000000-0000-0000-0000-0000000016e3', 5000, 5000);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000016c3', '00000000-0000-0000-0000-0000000016e4', 10000, 0);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000016d1', '00000000-0000-0000-0000-0000000016c2', '00000000-0000-0000-0000-0000000016e1',
   25000, 'active', now() - interval '9 days', now(), '00000000-0000-0000-0000-0000000016a1'),
  ('00000000-0000-0000-0000-0000000016d3', '00000000-0000-0000-0000-0000000016c2', '00000000-0000-0000-0000-0000000016e3',
   5000, 'active', now() - interval '8 days', now(), '00000000-0000-0000-0000-0000000016a1'),
  ('00000000-0000-0000-0000-0000000016d4', '00000000-0000-0000-0000-0000000016c3', '00000000-0000-0000-0000-0000000016e4',
   10000, 'active', now() - interval '7 days', now(), '00000000-0000-0000-0000-0000000016a1');
INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, detected_at)
VALUES ('00000000-0000-0000-0000-0000000016d2', '00000000-0000-0000-0000-0000000016c2', '00000000-0000-0000-0000-0000000016e2',
        8000, 'pending_review', now() - interval '1 day');

-- Comprobantes ya subidos: dos en la carpeta de A y uno en la de B.
INSERT INTO storage.objects (bucket_id, name)
VALUES
  ('delinquency-receipts', '00000000-0000-0000-0000-0000000016c2/r1.jpg'),
  ('delinquency-receipts', '00000000-0000-0000-0000-0000000016c2/r2.pdf'),
  ('delinquency-receipts', '00000000-0000-0000-0000-0000000016c3/rb.jpg');

-- ── La clienta A envía ─────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000016a2","role":"authenticated"}', true);

CREATE TEMP TABLE first_request AS
  SELECT public.delinquency_submit_regularization(
    '00000000-0000-0000-0000-0000000016d1', 10000, '  SINPE 4455  ', '00000000-0000-0000-0000-0000000016c2/r1.jpg') AS id;

SELECT is(
  (SELECT request_state || '|' || declared_amount || '|' || pending FROM public.delinquency_my_account()
    WHERE case_id = '00000000-0000-0000-0000-0000000016d1'),
  'pending_approval|10000|25000', 'la solicitud queda pendiente, con lo declarado, y la deuda de hoy no cambia');

RESET ROLE;
SELECT is(
  (SELECT reference || '|' || client_id FROM public.delinquency_regularizations WHERE id = (SELECT id FROM first_request)),
  'SINPE 4455|00000000-0000-0000-0000-0000000016c2', 'guarda la referencia sin espacios sobrantes y la clienta de la sesión');

SELECT is(
  (SELECT actor_id::text || '|' || (payload ->> 'declaredAmount') FROM public.audit_events
    WHERE action = 'delinquency.regularization.submitted' AND entity_id = (SELECT id FROM first_request)),
  '00000000-0000-0000-0000-0000000016a2|10000', 'el envío queda en la bitácora con la clienta como actor');
SET LOCAL ROLE authenticated;

-- ── Reenviar reemplaza ─────────────────────────────────────────────────────────
SELECT lives_ok(
  $$SELECT public.delinquency_submit_regularization(
      '00000000-0000-0000-0000-0000000016d1', 25000, NULL, '00000000-0000-0000-0000-0000000016c2/r2.pdf')$$,
  'la clienta puede mandar otro comprobante mientras el anterior sigue pendiente');

RESET ROLE;
SELECT is(
  (SELECT string_agg(state, ',' ORDER BY state) FROM public.delinquency_regularizations
    WHERE case_id = '00000000-0000-0000-0000-0000000016d1'),
  'pending_approval,replaced', 'el anterior queda reemplazado y solo el nuevo espera la revisión');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT declared_amount FROM public.delinquency_my_account() WHERE case_id = '00000000-0000-0000-0000-0000000016d1'),
  25000::bigint, 'el estado de cuenta muestra la solicitud vigente, no la reemplazada');

-- ── Lo declarado ───────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d1', 25001, NULL, '00000000-0000-0000-0000-0000000016c2/r1.jpg')$$,
  '22023', 'delinquency_declared_amount_invalid', 'no se declara más que la deuda de hoy');

SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d1', 0, NULL, '00000000-0000-0000-0000-0000000016c2/r1.jpg')$$,
  '22023', 'delinquency_declared_amount_invalid', 'lo declarado tiene que ser al menos un colón');

-- ── El comprobante ─────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d1', 1000, NULL, '00000000-0000-0000-0000-0000000016c3/rb.jpg')$$,
  '22023', 'delinquency_receipt_not_found', 'no se usa un comprobante de la carpeta de otra clienta');

SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d1', 1000, NULL, '00000000-0000-0000-0000-0000000016c2/no-existe.jpg')$$,
  '22023', 'delinquency_receipt_not_found', 'no se envía un comprobante que no se subió');

SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d1', 1000, NULL, '00000000-0000-0000-0000-0000000016c2/r1.jpg')$$,
  '22023', 'delinquency_receipt_already_used', 'un comprobante no se usa en dos solicitudes');

-- ── La morosidad ───────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d4', 1000, NULL, '00000000-0000-0000-0000-0000000016c2/r1.jpg')$$,
  'P0002', 'delinquency_case_not_regularizable', 'no se regulariza la morosidad de otra clienta');

SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d2', 1000, NULL, '00000000-0000-0000-0000-0000000016c2/r1.jpg')$$,
  'P0002', 'delinquency_case_not_regularizable', 'una morosidad por revisar no se regulariza');

SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d3', 1000, NULL, '00000000-0000-0000-0000-0000000016c2/r1.jpg')$$,
  '22023', 'delinquency_case_already_paid', 'una morosidad cuya cita ya no debe nada no se regulariza');

-- ── El estado de cuenta ────────────────────────────────────────────────────────
SELECT is(
  (SELECT string_agg(case_id::text, ',' ORDER BY since) FROM public.delinquency_my_account()),
  '00000000-0000-0000-0000-0000000016d1',
  'la clienta ve solo sus morosidades activas que todavía deben: ni la por revisar ni la ya pagada');

RESET ROLE;
UPDATE public.delinquency_cases SET state = 'settled', settled_at = now() - interval '2 days'
 WHERE id = '00000000-0000-0000-0000-0000000016d3';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT case_state || '|' || pending FROM public.delinquency_my_account() WHERE case_id = '00000000-0000-0000-0000-0000000016d3'),
  'settled|0', 'una morosidad saldada hace poco sigue a la vista, como saldada');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000016a3","role":"authenticated"}', true);

SELECT is(
  (SELECT string_agg(case_id::text, ',') FROM public.delinquency_my_account()),
  '00000000-0000-0000-0000-0000000016d4', 'otra clienta con sesión válida ve solo lo suyo');

-- ── Quién no puede ─────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000016a1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.delinquency_submit_regularization('00000000-0000-0000-0000-0000000016d1', 1000, NULL, '00000000-0000-0000-0000-0000000016c2/r1.jpg')$$,
  '42501', 'delinquency_not_a_client', 'la administradora no envía regularizaciones a nombre de una clienta');

SELECT is((SELECT count(*)::int FROM public.delinquency_my_account()), 0,
  'una sesión que no es clienta recibe un estado de cuenta vacío');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_my_account()$$,
  '42501', NULL, 'anon no consulta estados de cuenta');

SELECT * FROM finish();
ROLLBACK;
