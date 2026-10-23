-- US-AGE-10 · tope de reagendados: solo se cambia por la función, que valida el máximo y deja el evento.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(23);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000d02', 'reschedule-client@test.local'),
  ('00000000-0000-0000-0000-000000000d05', 'reschedule-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000d05';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000000dc6', '00000000-0000-0000-0000-000000000d02',
   'Clienta reagendar', 'reschedule-client@test.local', '+50688880061');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES
  ('00000000-0000-0000-0000-00000000da01', '00000000-0000-0000-0000-000000000a01', 'approved',
   (now() + interval '30 days'), (now() + interval '30 days 1 hour'),
   tstzrange((now() + interval '30 days'), (now() + interval '30 days 1 hour')),
   '00000000-0000-0000-0000-000000000dc6', '00000000-0000-0000-0000-000000000bf4', 'zz-test reagendar',
   true, 35000, 10000, 10000);

SELECT is((SELECT count(*) FROM public.scheduling_reschedule_policy), 1::bigint,
  'la política es una sola fila');

SELECT is((SELECT max_reschedules FROM public.scheduling_reschedule_policy), 1,
  'el tope arranca en 1 reagendado por cita');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_reschedule_policy (singleton, max_reschedules) VALUES (false, 2)$$,
  '23514', NULL, 'no admite una segunda fila');

SELECT throws_ok(
  $$UPDATE public.scheduling_reschedule_policy SET max_reschedules = 11$$,
  '23514', NULL, 'la base rechaza un tope de más de 10, venga de donde venga');

SELECT throws_ok(
  $$UPDATE public.scheduling_reschedule_policy SET max_reschedules = -1$$,
  '23514', NULL, 'la base rechaza un tope negativo');

SELECT is((SELECT reschedule_count FROM public.scheduling_appointments
            WHERE id = '00000000-0000-0000-0000-00000000da01'), 0,
  'una cita nueva arranca con 0 reagendados');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET reschedule_count = -1
     WHERE id = '00000000-0000-0000-0000-00000000da01'$$,
  '23514', NULL, 'el contador de una cita no puede ser negativo');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d02","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.scheduling_reschedule_policy), 0::bigint,
  'una clienta no lee la tabla de la política');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(2)$$,
  '42501', 'scheduling_not_admin', 'una clienta no cambia el tope');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d05","role":"authenticated"}', true);

SELECT is((SELECT max_reschedules FROM public.scheduling_reschedule_policy), 1,
  'la administradora lee el tope');

SELECT throws_ok(
  $$UPDATE public.scheduling_reschedule_policy SET max_reschedules = 10$$,
  '42501', NULL, 'ni la administradora cambia el tope con un UPDATE directo: solo por la función');

SELECT throws_ok(
  $$UPDATE public.scheduling_appointments SET reschedule_count = 0
     WHERE id = '00000000-0000-0000-0000-00000000da01'$$,
  '42501', NULL, 'ni la administradora toca el contador de una cita con un UPDATE directo');

SELECT results_eq(
  $$SELECT previous_max, new_max FROM public.scheduling_change_reschedule_limit(2)$$,
  $$VALUES (1, 2)$$,
  'la función devuelve el valor anterior y el nuevo');

RESET ROLE;

SELECT is((SELECT max_reschedules FROM public.scheduling_reschedule_policy), 2,
  'el tope quedó en 2');

SELECT results_eq(
  $$SELECT actor_id, payload FROM public.audit_events WHERE action = 'scheduling.reschedule_limit.changed'$$,
  $$VALUES ('00000000-0000-0000-0000-000000000d05'::uuid, '{"previousMax": 1, "newMax": 2}'::jsonb)$$,
  'el cambio dejó su evento, con la administradora como actora y de cuánto a cuánto');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d05","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT previous_max, new_max FROM public.scheduling_change_reschedule_limit(2)$$,
  $$VALUES (2, 2)$$,
  'repetir la misma cifra no falla');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.audit_events WHERE action = 'scheduling.reschedule_limit.changed'), 1::bigint,
  'y no deja un evento de un cambio que no ocurrió');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d05","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(11)$$,
  'P0001', 'scheduling_invalid_reschedule_limit', 'la función rechaza más de 10');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(-1)$$,
  'P0001', 'scheduling_invalid_reschedule_limit', 'la función rechaza una cifra negativa');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(NULL)$$,
  'P0001', 'scheduling_invalid_reschedule_limit', 'la función rechaza una cifra vacía');

SELECT results_eq(
  $$SELECT new_max FROM public.scheduling_change_reschedule_limit(0)$$,
  $$VALUES (0)$$,
  'cero es válido: reagendar desactivado');

RESET ROLE;

CREATE FUNCTION pg_temp.fail_limit_audit() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'bitacora caida'; END; $$;

CREATE TRIGGER fail_limit_audit BEFORE INSERT ON public.audit_events
  FOR EACH ROW WHEN (NEW.action = 'scheduling.reschedule_limit.changed')
  EXECUTE FUNCTION pg_temp.fail_limit_audit();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000d05","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(3)$$,
  'P0001', 'bitacora caida', 'si la bitácora falla, el cambio falla');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_reschedule_limit(2)$$,
  '42501', NULL, 'un anónimo no ejecuta la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
