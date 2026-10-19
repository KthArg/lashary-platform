-- US-AGE-05 · payments — contrato SQL que usa la reserva: anticipo con la exoneración aplicada.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005d1', 'deposit-due-admin@test.local'),
  ('00000000-0000-0000-0000-0000000005d2', 'deposit-due-exonerada@test.local'),
  ('00000000-0000-0000-0000-0000000005d3', 'deposit-due-exoneracion-levantada@test.local'),
  ('00000000-0000-0000-0000-0000000005d4', 'deposit-due-normal@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005d1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000005c3', '00000000-0000-0000-0000-0000000005d2',
   'Exonerada', 'deposit-due-exonerada@test.local', '+50688880003'),
  ('00000000-0000-0000-0000-0000000005c4', '00000000-0000-0000-0000-0000000005d3',
   'Exoneración levantada', 'deposit-due-exoneracion-levantada@test.local', '+50688880004'),
  ('00000000-0000-0000-0000-0000000005c5', '00000000-0000-0000-0000-0000000005d4',
   'Normal', 'deposit-due-normal@test.local', '+50688880005');

INSERT INTO public.payments_deposit_exemptions (client_id, exempted_by, reason, active)
VALUES
  ('00000000-0000-0000-0000-0000000005c3', '00000000-0000-0000-0000-0000000005d1', 'Clienta frecuente', true),
  ('00000000-0000-0000-0000-0000000005c4', '00000000-0000-0000-0000-0000000005d1', 'Ya no aplica', false);

SELECT is(public.payments_deposit_due('00000000-0000-0000-0000-0000000005c3', 10000), 0::bigint,
  'una clienta con exoneración vigente no paga anticipo');

SELECT is(public.payments_deposit_due('00000000-0000-0000-0000-0000000005c5', 10000), 10000::bigint,
  'una clienta sin exoneración paga el anticipo de la técnica');

SELECT is(public.payments_deposit_due('00000000-0000-0000-0000-0000000005c4', 10000), 10000::bigint,
  'una exoneración levantada ya no cuenta');

SELECT is(public.payments_deposit_due('00000000-0000-0000-0000-000000000bad', 10000), 10000::bigint,
  'una clienta que no existe paga el anticipo de la técnica');

SELECT is(public.payments_deposit_due('00000000-0000-0000-0000-0000000005c3', 0), 0::bigint,
  'una técnica sin anticipo queda en cero');

SELECT is(public.payments_deposit_due(NULL, 10000), NULL::bigint,
  'sin clienta no devuelve nada');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005d4","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.payments_deposit_due('00000000-0000-0000-0000-0000000005c3', 10000)$$,
  '42501', NULL, 'una clienta no puede preguntar quién está exonerada');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005d1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.payments_deposit_due('00000000-0000-0000-0000-0000000005c3', 10000)$$,
  '42501', NULL, 'ni la administradora la llama directo: solo la reserva');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT public.payments_deposit_due('00000000-0000-0000-0000-0000000005c3', 10000)$$,
  '42501', NULL, 'anónimo: no la ejecuta');

SET LOCAL ROLE service_role;

SELECT throws_ok(
  $$SELECT public.payments_deposit_due('00000000-0000-0000-0000-0000000005c3', 10000)$$,
  '42501', NULL, 'service_role tampoco (SEC-003)');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'payments_deposit_due' AND p.prosecdef),
  0, 'la función no eleva permisos');

SELECT * FROM finish();
ROLLBACK;
