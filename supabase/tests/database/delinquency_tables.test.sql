-- delinquency_tables.test.sql
-- US-MOR-01 · feature delinquency — morosidades y configuración (DOM-012, SEC-001, SEC-002).
-- La gracia nace en 7 días y nadie la cambia directo, ni la administradora (solo la función de una
-- pieza posterior); una morosidad por cita; el estado y la decisión van juntos; staff
-- lee y no escribe directo; la clienta no ve nada y anon no tiene permiso. El rol se siembra como
-- superusuario local dentro de la transacción y todo se deshace con ROLLBACK (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'moro-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'moro-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000d1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-0000000000d2',
   'Clienta morosa', 'moro-clienta@test.local', '00000000020');

INSERT INTO public.delinquency_cases (client_id, appointment_id, pending)
VALUES ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000ad01', 20000);

-- ── Restricciones de la tabla (como dueño, sin rol de sesión) ───────────────────
SELECT throws_ok(
  $$INSERT INTO public.delinquency_cases (client_id, appointment_id, pending)
    VALUES ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000ad01', 5000)$$,
  '23505', NULL, 'una cita no genera dos morosidades');

SELECT throws_ok(
  $$INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, decided_at)
    VALUES ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000ad02', 5000,
            'pending_review', now())$$,
  '23514', NULL, 'una morosidad por revisar no puede traer una decisión');

SELECT throws_ok(
  $$INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state)
    VALUES ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000ad03', 5000,
            'active')$$,
  '23514', NULL, 'una morosidad activa sin quién la confirmó no existe');

-- ── Como admin ─────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT grace_days FROM public.delinquency_settings),
  7, 'la gracia arranca en 7 días, valor aprobado por el PO');

SELECT throws_ok(
  $$UPDATE public.delinquency_settings SET grace_days = 10$$,
  '42501', NULL, 'ni la administradora cambia la gracia directo: va por la función, que deja bitácora');

SELECT throws_ok(
  $$INSERT INTO public.delinquency_cases (client_id, appointment_id, pending)
    VALUES ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000ad04', 5000)$$,
  '42501', NULL, 'staff no inserta morosidades directo: las escriben las funciones');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_cases),
  1, 'la administradora lee las morosidades');

-- ── Como la clienta ────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_cases),
  0, 'la clienta no ve ni su propia morosidad: la RLS la oculta');

SELECT throws_ok(
  $$UPDATE public.delinquency_settings SET grace_days = 30$$,
  '42501', NULL, 'la clienta no puede cambiar la gracia');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT grace_days FROM public.delinquency_settings),
  7, 'la gracia sigue en 7: nadie la cambió directo');

-- ── Como anon ──────────────────────────────────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.delinquency_settings$$,
  '42501', NULL, 'anon: no lee la configuración');

SELECT * FROM finish();
ROLLBACK;
