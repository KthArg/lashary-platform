-- delinquency_cases_settled_constraints.test.sql
-- US-MOR-05 · feature delinquency — los CHECK de estado admiten `settled` (US-MOR-03) también cuando la
-- morosidad ya tenía una condonación parcial: condonar parcial, la clienta paga el resto y la aprobación de
-- su regularización deja la morosidad `settled` sin perder lo condonado.
-- El UPDATE a `settled` imita el de approve_regularization (US-MOR-03); si esa historia ya agregó
-- `settled_at`, también lo fija (su CHECK exige la fecha).
-- Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(5);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'settled-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'settled-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000d1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-0000000000d2',
   'Clienta que termina de pagar', 'settled-clienta@test.local', '00000000050');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000d0a1', 10000, 0);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000d0101', '00000000-0000-0000-0000-00000000cd01',
   '00000000-0000-0000-0000-00000000d0a1', 10000, 'active', now(), '00000000-0000-0000-0000-0000000000d1');

SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT state FROM public.delinquency_forgive_case('00000000-0000-0000-0000-0000000d0101', 4000, 'ayuda parcial')),
  'active', 'condonar parcial deja la morosidad active');

RESET ROLE;

INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
VALUES ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000d0a1', 'payment', -6000);

SELECT lives_ok(
  $$DO $do$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'delinquency_cases' AND column_name = 'settled_at'
      ) THEN
        UPDATE public.delinquency_cases SET state = 'settled', settled_at = now()
         WHERE id = '00000000-0000-0000-0000-0000000d0101';
      ELSE
        UPDATE public.delinquency_cases SET state = 'settled'
         WHERE id = '00000000-0000-0000-0000-0000000d0101';
      END IF;
    END
  $do$$$,
  'saldar con un pago una morosidad con condonación parcial la deja settled sin violar los CHECK');

SELECT is(
  (SELECT state FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0101'),
  'settled', 'la morosidad quedó settled');

SELECT is(
  (SELECT exception_amount FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-0000000d0101'),
  4000::bigint, 'lo condonado antes se conserva en la fila (criterio 4)');

SELECT throws_ok(
  $$UPDATE public.delinquency_cases SET state = 'inexistente' WHERE id = '00000000-0000-0000-0000-0000000d0101'$$,
  '23514', NULL, 'un estado fuera de la lista sigue rechazado por el CHECK');

SELECT * FROM finish();
ROLLBACK;
