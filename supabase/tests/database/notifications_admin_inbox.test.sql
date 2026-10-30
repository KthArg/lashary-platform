BEGIN;
SELECT plan(15);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000001a1', 'staff-admin-not01@test.local'),
  ('00000000-0000-0000-0000-0000000001c1', 'clienta-not01@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000001a1';

SELECT public.notifications_record_booking(
  '00000000-0000-0000-0000-00000000b001', 'Ana Pérez', 'Lifting de pestañas', '2026-11-05 15:00:00+00');
SELECT public.notifications_record_booking(
  '00000000-0000-0000-0000-00000000b001', 'Ana Pérez', 'Lifting de pestañas', '2026-11-05 15:00:00+00');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-00000000b001'),
  1, 'registrar dos veces la misma reserva deja un solo aviso');

SELECT ok(
  (SELECT read_at IS NULL FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-00000000b001'),
  'el aviso nace sin leer');

SELECT throws_ok(
  $$SELECT public.notifications_record_booking('00000000-0000-0000-0000-00000000b002', '  ', 'Lifting', now())$$,
  '23514', NULL, 'un aviso sin nombre de clienta se rechaza');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000001a1","role":"authenticated"}', true);

SELECT is(
  (SELECT client_name || ' · ' || service_name FROM public.notifications_admin_inbox
    WHERE appointment_id = '00000000-0000-0000-0000-00000000b001'),
  'Ana Pérez · Lifting de pestañas', 'staff: ve el aviso con clienta y servicio');

UPDATE public.notifications_admin_inbox SET read_at = now()
 WHERE appointment_id = '00000000-0000-0000-0000-00000000b001';
SELECT ok(
  (SELECT read_at IS NOT NULL FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-00000000b001'),
  'staff: marca el aviso como leído');

UPDATE public.notifications_admin_inbox SET read_at = NULL
 WHERE appointment_id = '00000000-0000-0000-0000-00000000b001';
SELECT ok(
  (SELECT read_at IS NULL FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-00000000b001'),
  'staff: vuelve a marcarlo como no leído');

SELECT throws_ok(
  $$UPDATE public.notifications_admin_inbox SET client_name = 'Otra' WHERE appointment_id = '00000000-0000-0000-0000-00000000b001'$$,
  '42501', NULL, 'staff: no puede cambiar los datos del aviso, solo read_at');

SELECT throws_ok(
  $$INSERT INTO public.notifications_admin_inbox (kind, appointment_id, client_name, service_name, starts_at)
    VALUES ('booking_created', '00000000-0000-0000-0000-00000000b003', 'X', 'Y', now())$$,
  '42501', NULL, 'staff: no inserta avisos directo');

SELECT throws_ok(
  $$DELETE FROM public.notifications_admin_inbox$$,
  '42501', NULL, 'staff: no borra avisos');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000001c1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox),
  0, 'clienta: no ve ningún aviso');

UPDATE public.notifications_admin_inbox SET read_at = now();

SELECT throws_ok(
  $$SELECT public.notifications_record_booking('00000000-0000-0000-0000-00000000b004', 'Falsa', 'Falso', now())$$,
  '42501', NULL, 'clienta: no puede fabricar avisos');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT count(*) FROM public.notifications_admin_inbox$$,
  '42501', NULL, 'anon: no lee la tabla');

SELECT throws_ok(
  $$SELECT public.notifications_record_booking('00000000-0000-0000-0000-00000000b005', 'Falsa', 'Falso', now())$$,
  '42501', NULL, 'anon: no puede fabricar avisos');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000001a1","role":"authenticated"}', true);

SELECT ok(
  (SELECT read_at IS NULL FROM public.notifications_admin_inbox WHERE appointment_id = '00000000-0000-0000-0000-00000000b001'),
  'la clienta no logró marcar el aviso como leído');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_admin_inbox
    WHERE appointment_id IN ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000b002',
                             '00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-00000000b004',
                             '00000000-0000-0000-0000-00000000b005')),
  1, 'nadie agregó ni borró avisos');

SELECT * FROM finish();
ROLLBACK;
