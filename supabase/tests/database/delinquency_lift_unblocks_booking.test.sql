-- delinquency_lift_unblocks_booking.test.sql
-- US-MOR-05 · feature delinquency — criterio 1 demostrado contra US-MOR-02, no solo contra el estado
-- en la tabla: tras delinquency_lift_case, delinquency_booking_block deja de listar esa morosidad,
-- aunque la cita siga debiendo en el ledger (levantar no toca el ledger).
-- Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(2);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'unblock-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'unblock-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000c1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-0000000000c2',
   'Clienta a levantar', 'unblock-clienta@test.local', '00000000050');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

SELECT public.payments_record_close_entries(
  '00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-00000000c0f1', 9000, 0);

INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, state, decided_at, decided_by)
VALUES ('00000000-0000-0000-0000-0000000f0001', '00000000-0000-0000-0000-00000000cc01',
   '00000000-0000-0000-0000-00000000c0f1', 9000, 'active', now(), '00000000-0000-0000-0000-0000000000c1');

SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cc01')),
  1, 'antes de levantar, la morosidad active con saldo bloquea');

SELECT public.delinquency_lift_case('00000000-0000-0000-0000-0000000f0001', 'se levanta a mano');

SELECT is(
  (SELECT count(*)::int FROM public.delinquency_booking_block('00000000-0000-0000-0000-00000000cc01')),
  0, 'criterio 1: tras levantar, delinquency_booking_block ya no la lista, aunque la cita sigue debiendo 9000 en el ledger');

SELECT * FROM finish();
ROLLBACK;
