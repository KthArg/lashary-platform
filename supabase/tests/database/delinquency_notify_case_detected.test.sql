-- delinquency_notify_case_detected.test.sql
-- US-MOR-01 · una morosidad por revisar deja un aviso en la bandeja de la administradora (criterio 3).
-- El aviso lleva la clienta y lo que debe, no una cita; una morosidad ya activa no avisa; la detección real
-- deja un aviso por morosidad y correrla de nuevo no repite; solo staff ve los avisos y nadie fuera del
-- disparador puede registrarlos; un fallo al registrar el aviso no bloquea la morosidad (DOM-012, SEC-001,
-- SEC-002). Todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'aviso-mor-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'aviso-mor-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000e1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000ee01', '00000000-0000-0000-0000-0000000000e2',
   'Lucía Mora', 'aviso-mor-clienta@test.local', '00000000040'),
  ('00000000-0000-0000-0000-00000000ee02', NULL,
   'Marta Solís', 'aviso-mor-otra@test.local', '00000000041');

-- ── Una morosidad por revisar deja su aviso ─────────────────────────────────────
INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending)
VALUES ('00000000-0000-0000-0000-00000000ec01', '00000000-0000-0000-0000-00000000ee01',
        '00000000-0000-0000-0000-00000000ea01', 20000);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox
    WHERE kind = 'delinquency_review' AND event_id = '00000000-0000-0000-0000-00000000ec01'),
  1, 'una morosidad por revisar deja un aviso en la bandeja');

SELECT results_eq(
  $$SELECT client_name, pending_amount, appointment_id, service_name, starts_at
      FROM public.notifications_admin_inbox
     WHERE event_id = '00000000-0000-0000-0000-00000000ec01'$$,
  $$VALUES ('Lucía Mora'::text, 20000::bigint, '00000000-0000-0000-0000-00000000ea01'::uuid, NULL::text, NULL::timestamptz)$$,
  'el aviso lleva el nombre de la clienta y lo que debe, sin servicio ni hora de cita');

-- ── Una morosidad que nace activa no avisa: ya la decidió la administradora ─────
INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, decided_at, decided_by)
VALUES ('00000000-0000-0000-0000-00000000ee02', '00000000-0000-0000-0000-00000000ea02', 5000,
        'active', now(), '00000000-0000-0000-0000-0000000000e1');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox
    WHERE appointment_id = '00000000-0000-0000-0000-00000000ea02'),
  0, 'una morosidad que no está por revisar no deja aviso');

-- ── La detección real deja un aviso por cada morosidad que genera ───────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount, created_at)
VALUES
  ('00000000-0000-0000-0000-00000000ee01', '00000000-0000-0000-0000-00000000ea03', 'charge', 12000, now() - interval '10 days'),
  ('00000000-0000-0000-0000-00000000ee02', '00000000-0000-0000-0000-00000000ea04', 'charge', 8000, now() - interval '10 days');

SET LOCAL ROLE authenticated;

SELECT is(
  public.delinquency_detect_unpaid(),
  2, 'la detección genera una morosidad por cada cita impaga pasada la gracia');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox
    WHERE kind = 'delinquency_review'
      AND appointment_id IN ('00000000-0000-0000-0000-00000000ea03', '00000000-0000-0000-0000-00000000ea04')),
  2, 'y deja un aviso por cada una');

SELECT is(
  public.delinquency_detect_unpaid(),
  0, 'correr la detección de nuevo no genera nada');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE kind = 'delinquency_review'),
  3, 'ni repite los avisos: el de la primera, más los dos de la detección');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox
    WHERE kind = 'delinquency_review' AND read_at IS NULL),
  3, 'la administradora ve los avisos y todos están sin leer');

-- ── La clienta no ve los avisos ni puede registrarlos ───────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox),
  0, 'la clienta no ve ningún aviso de la bandeja');

SELECT throws_ok(
  $$SELECT public.notifications_record_delinquency_review(
      gen_random_uuid(), gen_random_uuid(), 'Falsa', 1000)$$,
  '42501', NULL, 'nadie con sesión registra un aviso de morosidad directo: solo el disparador');

RESET ROLE;

-- ── Un fallo al registrar el aviso no bloquea la morosidad ──────────────────────
CREATE OR REPLACE FUNCTION public.notifications_record_delinquency_review(
  p_case_id uuid, p_appointment_id uuid, p_client_name text, p_pending bigint)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falla simulada'; END; $$;

SELECT lives_ok(
  $$INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending)
    VALUES ('00000000-0000-0000-0000-00000000ec09', '00000000-0000-0000-0000-00000000ee01',
            '00000000-0000-0000-0000-00000000ea09', 1500)$$,
  'si el aviso falla, la morosidad se crea igual');

-- ── La tabla exige la combinación de columnas de cada tipo ──────────────────────
SELECT throws_ok(
  $$INSERT INTO public.notifications_admin_inbox (kind, event_id, appointment_id, client_name)
    VALUES ('delinquency_review', gen_random_uuid(), gen_random_uuid(), 'Sin monto')$$,
  '23514', NULL, 'un aviso de morosidad sin lo que debe no existe');

SELECT throws_ok(
  $$INSERT INTO public.notifications_admin_inbox
      (kind, appointment_id, client_name, service_name, starts_at, pending_amount)
    VALUES ('booking_created', gen_random_uuid(), 'Con monto', 'Servicio', now(), 1000)$$,
  '23514', NULL, 'un aviso de reserva no lleva lo que debe una clienta');

SELECT * FROM finish();
ROLLBACK;
