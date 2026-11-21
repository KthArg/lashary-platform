-- delinquency_regularization_notice.test.sql
-- US-MOR-03 · delinquency y notifications — cuando una clienta envía un comprobante, la bandeja de la
-- administradora recibe un aviso con su nombre, lo que declaró y la cita de la morosidad; uno por solicitud
-- (reenviar deja otro aviso, por la solicitud nueva). La clienta no ve la bandeja y nadie con sesión llama a la
-- función del aviso. Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000019a1', 'aviso-regul-admin@test.local'),
  ('00000000-0000-0000-0000-0000000019a2', 'aviso-regul-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000019a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000019c2', '00000000-0000-0000-0000-0000000019a2', 'Lucía Aviso',
        'aviso-regul-clienta@test.local', '+50688892002');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000019a1","role":"authenticated"}', true);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000019c2', '00000000-0000-0000-0000-0000000019e1', 30000, 5000);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES ('00000000-0000-0000-0000-0000000019d1', '00000000-0000-0000-0000-0000000019c2', '00000000-0000-0000-0000-0000000019e1',
        25000, 'active', now() - interval '9 days', now(), '00000000-0000-0000-0000-0000000019a1');

INSERT INTO storage.objects (bucket_id, name)
VALUES
  ('delinquency-receipts', '00000000-0000-0000-0000-0000000019c2/r1.jpg'),
  ('delinquency-receipts', '00000000-0000-0000-0000-0000000019c2/r2.pdf');

-- ── La clienta envía ───────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000019a2","role":"authenticated"}', true);

CREATE TEMP TABLE first_request AS
  SELECT public.delinquency_submit_regularization(
    '00000000-0000-0000-0000-0000000019d1', 10000, NULL, '00000000-0000-0000-0000-0000000019c2/r1.jpg') AS id;

SELECT is((SELECT count(*)::int FROM public.notifications_admin_inbox), 0, 'la clienta no ve la bandeja de la administradora');

SELECT throws_ok(
  $$SELECT public.notifications_record_regularization_submitted(gen_random_uuid(), gen_random_uuid(), 'X', 100)$$,
  '42501', NULL, 'nadie con sesión registra avisos llamando a la función');

-- ── La administradora lo ve ────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000019a1","role":"authenticated"}', true);

SELECT is(
  (SELECT kind || '|' || client_name || '|' || declared_amount || '|' || appointment_id
     FROM public.notifications_admin_inbox WHERE event_id = (SELECT id FROM first_request)),
  'regularization_submitted|Lucía Aviso|10000|00000000-0000-0000-0000-0000000019e1',
  'el aviso trae el nombre de la clienta, lo que declaró y la cita de la morosidad');

SELECT ok(
  (SELECT service_name IS NULL AND starts_at IS NULL AND pending_amount IS NULL AND read_at IS NULL
     FROM public.notifications_admin_inbox WHERE event_id = (SELECT id FROM first_request)),
  'no lleva servicio, hora ni deuda, y nace sin leer');

-- ── Reenviar deja otro aviso, por la solicitud nueva ───────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000019a2","role":"authenticated"}', true);
SELECT public.delinquency_submit_regularization(
  '00000000-0000-0000-0000-0000000019d1', 25000, NULL, '00000000-0000-0000-0000-0000000019c2/r2.pdf');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000019a1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE kind = 'regularization_submitted'),
  2, 'cada solicitud deja su aviso');

-- ── Las formas del aviso ───────────────────────────────────────────────────────
RESET ROLE;

SELECT lives_ok(
  $$SELECT public.notifications_record_regularization_submitted(
      (SELECT id FROM first_request), '00000000-0000-0000-0000-0000000019e1', 'Lucía Aviso', 10000)$$,
  'registrar dos veces el aviso de la misma solicitud no falla');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE event_id = (SELECT id FROM first_request)),
  1, 'y no lo duplica');

SELECT throws_ok(
  $$INSERT INTO public.notifications_admin_inbox (kind, event_id, appointment_id, client_name, pending_amount)
    VALUES ('regularization_submitted', gen_random_uuid(), gen_random_uuid(), 'X', 100)$$,
  '23514', NULL, 'un aviso de comprobante sin lo declarado no es válido');

SELECT * FROM finish();
ROLLBACK;
