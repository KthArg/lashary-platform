-- US-AGE-06 · ventana de cancelación: solo se cambia por la función, que valida el tope y deja el evento.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000ac2', 'policy-client@test.local'),
  ('00000000-0000-0000-0000-000000000ac5', 'policy-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000000ac5';

SELECT is((SELECT count(*) FROM public.scheduling_cancellation_policy), 1::bigint,
  'la política es una sola fila');

SELECT is((SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy), 48,
  'la ventana arranca en 48 horas');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_cancellation_policy (singleton, cancellation_window_hours) VALUES (false, 24)$$,
  '23514', NULL, 'no admite una segunda fila');

SELECT throws_ok(
  $$UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 721$$,
  '23514', NULL, 'la base rechaza una ventana de más de 720 horas, venga de donde venga');

SELECT throws_ok(
  $$UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = -1$$,
  '23514', NULL, 'la base rechaza una ventana negativa');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000ac2","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.scheduling_cancellation_policy), 0::bigint,
  'una clienta no lee la tabla de la política');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_cancellation_window(24)$$,
  '42501', 'scheduling_not_admin', 'una clienta no cambia la ventana');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000ac5","role":"authenticated"}', true);

SELECT is((SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy), 48,
  'la administradora lee la ventana');

SELECT throws_ok(
  $$UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 100000$$,
  '42501', NULL, 'ni la administradora cambia la ventana con un UPDATE directo: solo por la función');

SELECT results_eq(
  $$SELECT previous_hours, new_hours FROM public.scheduling_change_cancellation_window(24)$$,
  $$VALUES (48, 24)$$,
  'la función devuelve el valor anterior y el nuevo');

RESET ROLE;

SELECT is((SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy), 24,
  'la ventana quedó en 24');

SELECT results_eq(
  $$SELECT actor_id, payload FROM public.audit_events WHERE action = 'scheduling.cancellation_window.changed'$$,
  $$VALUES ('00000000-0000-0000-0000-000000000ac5'::uuid, '{"previousHours": 48, "newHours": 24}'::jsonb)$$,
  'el cambio dejó su evento, con la administradora como actora y de cuánto a cuánto');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000ac5","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT previous_hours, new_hours FROM public.scheduling_change_cancellation_window(24)$$,
  $$VALUES (24, 24)$$,
  'repetir la misma cifra no falla');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.audit_events WHERE action = 'scheduling.cancellation_window.changed'), 1::bigint,
  'y no deja un evento de un cambio que no ocurrió');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000ac5","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_cancellation_window(721)$$,
  'P0001', 'scheduling_invalid_cancellation_window', 'la función rechaza más de 720 horas');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_cancellation_window(-1)$$,
  'P0001', 'scheduling_invalid_cancellation_window', 'la función rechaza una cifra negativa');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_cancellation_window(NULL)$$,
  'P0001', 'scheduling_invalid_cancellation_window', 'la función rechaza una cifra vacía');

SELECT results_eq(
  $$SELECT new_hours FROM public.scheduling_change_cancellation_window(0)$$,
  $$VALUES (0)$$,
  'cero es válido: sin ventana');

RESET ROLE;

CREATE FUNCTION pg_temp.fail_window_audit() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'bitacora caida'; END; $$;

CREATE TRIGGER fail_window_audit BEFORE INSERT ON public.audit_events
  FOR EACH ROW WHEN (NEW.action = 'scheduling.cancellation_window.changed')
  EXECUTE FUNCTION pg_temp.fail_window_audit();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000ac5","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_cancellation_window(72)$$,
  'P0001', 'bitacora caida', 'si la bitácora falla, el cambio falla');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_change_cancellation_window(24)$$,
  '42501', NULL, 'un anónimo no ejecuta la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
