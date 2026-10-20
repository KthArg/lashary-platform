-- US-AGE-05 · scheduling — alerta cuando el constraint de no-solape rechaza una reserva.
-- Con el lock por recurso el constraint no debería disparar nunca desde la función de reserva; aquí
-- se fuerza con un disparador de prueba que ocupa el espacio justo antes del INSERT.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005aa', 'alerts-admin@test.local'),
  ('00000000-0000-0000-0000-0000000005ab', 'alerts-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005aa';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000005ce', '00000000-0000-0000-0000-0000000005ab',
        'Clienta', 'alerts-clienta@test.local', '+50688880014');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, buffer_min, deposit, aftercare_text)
VALUES ('00000000-0000-0000-0000-0000000005fa', 'zz-test alertas', 'lash_classic', 20000, 60, 15, 5000, 'cuidados');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES ('00000000-0000-0000-0000-000000000a01', 1, 540, 1020);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005ab","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
      '00000000-0000-0000-0000-0000000005fa', true)$$,
  'una reserva normal se guarda');

RESET ROLE;

SELECT is((SELECT count(*)::int FROM public.scheduling_alerts), 0, 'una reserva normal no deja ninguna alerta');

CREATE FUNCTION public.zz_test_phantom_overlap() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range, status)
  VALUES (NEW.resource_id, NEW.starts_at, NEW.ends_at, NEW.occupied_range, 'approved');
  RETURN NEW;
END;
$$;

CREATE TRIGGER zz_test_phantom_overlap
  BEFORE INSERT ON public.scheduling_appointments
  FOR EACH ROW WHEN (NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION public.zz_test_phantom_overlap();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005ab","role":"authenticated"}', true);

SELECT is(
  (SELECT (booked).id FROM (SELECT public.scheduling_book_appointment('00000000-0000-0000-0000-000000000a01',
     '2027-09-06 11:00-06', '00000000-0000-0000-0000-0000000005fa', true) AS booked) result),
  NULL::uuid, 'si el constraint rechaza, la función devuelve vacío en vez de fallar');

RESET ROLE;

SELECT results_eq(
  $$SELECT kind, resource_id, client_id, requested_from, requested_until FROM public.scheduling_alerts$$,
  $$VALUES ('appointment_overlap_rejected'::text, '00000000-0000-0000-0000-000000000a01'::uuid,
            '00000000-0000-0000-0000-0000000005ce'::uuid, '2027-09-06 11:00-06'::timestamptz,
            '2027-09-06 12:15-06'::timestamptz)$$,
  'queda una alerta con el recurso, la clienta y el espacio pedido (con la limpieza)');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments
    WHERE client_id = '00000000-0000-0000-0000-0000000005ce'),
  1, 'la reserva rechazada no dejó ninguna cita: solo existe la primera');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005aa","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_alerts), 1, 'staff: ve la alerta');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_alerts (kind, resource_id, requested_from, requested_until)
    VALUES ('appointment_overlap_rejected', '00000000-0000-0000-0000-000000000a01',
            '2027-09-07 10:00-06', '2027-09-07 11:00-06')$$,
  '42501', NULL, 'staff: no inserta alertas a mano');

SELECT lives_ok($$UPDATE public.scheduling_alerts SET created_at = '2000-01-01'$$, 'staff: intentar modificar no falla');

SELECT lives_ok($$DELETE FROM public.scheduling_alerts$$, 'staff: intentar borrar no falla');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_alerts WHERE created_at > '2001-01-01'),
  1, 'pero la alerta sigue intacta: no hay política de UPDATE ni de DELETE');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005ab","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_alerts), 0, 'una clienta no ve las alertas');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is((SELECT count(*)::int FROM public.scheduling_alerts), 0, 'anónimo: no ve ninguna alerta');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
