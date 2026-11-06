-- US-AGE-12 · el ledger solo se escribe al cerrar una cita (M3) y el cierre no deja filas
-- incoherentes (B4). Cobertura: staff no inserta ni llama a la función del ledger directo, el cierre
-- sigue escribiendo los asientos, y los CHECK de la cita cerrada. Todo se deshace con ROLLBACK.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000c30', 'ledger-close-admin@test.local'),
  ('00000000-0000-0000-0000-000000000c31', 'ledger-close-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000c30';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-000000000c31',
        'Clienta del ledger cerrado', 'ledger-close-clienta@test.local', '+50688880063');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, package_id, package_name,
   service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-00000000e1a1', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '403 days 10 hours', now() - interval '403 days 9 hours',
   tstzrange(now() - interval '403 days 10 hours', now() - interval '403 days 9 hours'),
   '00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-0000000009b1', 'zz-test paquete ledger',
   40000, 10000, 10000),
  ('00000000-0000-0000-0000-00000000e1a2', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() - interval '403 days 8 hours', now() - interval '403 days 7 hours',
   tstzrange(now() - interval '403 days 8 hours', now() - interval '403 days 7 hours'),
   '00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-0000000009b1', 'zz-test paquete ledger',
   40000, 10000, 10000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000c30","role":"authenticated"}', true);

SELECT throws_ok(
  $$INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
    VALUES ('00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-00000000e1a1', 'charge', 100)$$,
  '42501', NULL, 'staff no puede insertar un asiento directo en el ledger');

SELECT throws_ok(
  $$SELECT public.payments_record_close_entries(
      '00000000-0000-0000-0000-000000000ce1', '00000000-0000-0000-0000-00000000e1a1', 100, 0)$$,
  '42501', NULL, 'staff no puede llamar a la función del ledger sin cerrar la cita');

SELECT results_eq(
  $$SELECT charge_amount, amount_due
      FROM public.scheduling_close_appointment('00000000-0000-0000-0000-00000000e1a1', 'completed')$$,
  $$VALUES (40000::bigint, 30000::bigint)$$,
  'cerrar la cita sigue escribiendo el ledger sin los permisos directos');

SELECT is(
  (SELECT count(*)::int FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a1'),
  2, 'el cierre dejó el cargo y el crédito del anticipo');

SELECT is(
  (SELECT created_by FROM public.payments_ledger_entries
    WHERE appointment_id = '00000000-0000-0000-0000-00000000e1a1' AND kind = 'charge'),
  '00000000-0000-0000-0000-000000000c30'::uuid, 'el asiento sigue marcado con quien cerró la cita');

RESET ROLE;

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET closed_by = '00000000-0000-0000-0000-000000000c30', closed_at = now()
     WHERE id = '00000000-0000-0000-0000-00000000e1a2'$$,
  '23514', NULL, 'una cita aprobada no puede tener fecha de cierre');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments
       SET status = 'no_show', closed_by = '00000000-0000-0000-0000-000000000c30', closed_at = now(),
           delivered_technique_name = 'zz-test servicio'
     WHERE id = '00000000-0000-0000-0000-00000000e1a2'$$,
  '23514', NULL, 'una ausencia no puede llevar servicio prestado');

SELECT lives_ok(
  $$UPDATE public.scheduling_appointments
       SET status = 'no_show', closed_by = '00000000-0000-0000-0000-000000000c30', closed_at = now()
     WHERE id = '00000000-0000-0000-0000-00000000e1a2'$$,
  'una ausencia cerrada sin servicio prestado es válida');

SELECT * FROM finish();
ROLLBACK;
