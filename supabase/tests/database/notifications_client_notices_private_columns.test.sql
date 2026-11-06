-- US-NOT-02 · la clienta lee su aviso pero no los datos internos del envío.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000009a1', 'aviso-privado-admin@test.local'),
  ('00000000-0000-0000-0000-0000000009a2', 'aviso-privado-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000009a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-0000000009a2',
        'Clienta', 'aviso-privado-clienta@test.local', '+50688880097');

DELETE FROM public.notifications_client_notices;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-000000000a01', 'approved',
   '2047-10-07 15:00+00', '2047-10-07 16:00+00', tstzrange('2047-10-07 15:00+00', '2047-10-07 16:15+00'),
   '00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-0000000009f1', 'zz-test privado',
   true, 35000, 10000, 10000);

INSERT INTO public.notifications_client_notices
  (id, kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at, attempts, last_error)
VALUES
  ('00000000-0000-0000-0000-0000000009d1', 'reschedule_rejected', gen_random_uuid(), '00000000-0000-0000-0000-0000000009e1',
   '00000000-0000-0000-0000-0000000009c2', 'privado', '2047-10-14 15:00+00', '2047-10-07 15:00+00', 2, 'falló el canal');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT service_name, kept_starts_at FROM public.notifications_client_notices$$,
  $$VALUES ('privado'::text, '2047-10-07 15:00+00'::timestamptz)$$,
  'la clienta lee las columnas que muestra su pantalla');
SELECT throws_ok($$SELECT last_error FROM public.notifications_client_notices$$, '42501', NULL, 'la clienta no lee last_error');
SELECT throws_ok($$SELECT attempts FROM public.notifications_client_notices$$, '42501', NULL, 'la clienta no lee attempts');
SELECT throws_ok($$SELECT claimed_at FROM public.notifications_client_notices$$, '42501', NULL, 'la clienta no lee claimed_at');
SELECT throws_ok($$SELECT last_channel FROM public.notifications_client_notices$$, '42501', NULL, 'la clienta no lee last_channel');
SELECT throws_ok($$SELECT sent_at FROM public.notifications_client_notices$$, '42501', NULL, 'la clienta no lee sent_at');
SELECT throws_ok($$SELECT * FROM public.notifications_client_notices$$, '42501', NULL, 'la clienta no pide la fila completa');
SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 10, 10)$$,
  '42501', NULL, 'la clienta no reclama avisos');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a1","role":"authenticated"}', true);
SELECT throws_ok($$SELECT last_error FROM public.notifications_client_notices$$, '42501', NULL, 'ni el personal lee last_error por la tabla');
SELECT results_eq(
  $$SELECT attempts, status FROM public.notifications_claim_client_notices('2047-10-01 12:00+00', 10, 10)$$,
  $$VALUES (2, 'claimed'::text)$$,
  'el personal recibe el aviso completo al reclamarlo');

SELECT * FROM finish();
ROLLBACK;
