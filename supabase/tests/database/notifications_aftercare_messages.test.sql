BEGIN;
SELECT plan(24);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000009a1', 'cuidado-admin@test.local'),
  ('00000000-0000-0000-0000-0000000009a2', 'cuidado-clienta-a@test.local'),
  ('00000000-0000-0000-0000-0000000009a3', 'cuidado-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000009a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-0000000009a2',
   'Clienta A', 'cuidado-clienta-a@test.local', '+50688880191'),
  ('00000000-0000-0000-0000-0000000009c3', '00000000-0000-0000-0000-0000000009a3',
   'Clienta B', 'cuidado-clienta-b@test.local', '+50688880192');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000009f1', 'zz-aftercare B', 'lash_classic', 20000, 90, 15, 5000, 'texto de B', true),
  ('00000000-0000-0000-0000-0000000009f2', 'zz-aftercare A', 'brow_design', 10000, 45, 10, 2000, 'texto de A', true);

INSERT INTO public.catalog_packages (id, name, price, deposit, is_active)
VALUES ('00000000-0000-0000-0000-0000000009d1', 'zz-aftercare paquete', 25000, 7000, true);

INSERT INTO public.catalog_package_techniques (package_id, technique_id) VALUES
  ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009f1'),
  ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009f2');

DELETE FROM public.notifications_aftercare_messages;

SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000009c2',
  '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', '  Evita el agua hoy  ');
SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009e2', '00000000-0000-0000-0000-0000000009c3',
  '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', '   ');
SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009e3', '00000000-0000-0000-0000-0000000009c2',
  NULL, '00000000-0000-0000-0000-0000000009d1', 'zz-aftercare paquete', NULL);

SELECT results_eq(
  $$SELECT aftercare_text, client_note FROM public.notifications_aftercare_messages WHERE appointment_id = '00000000-0000-0000-0000-0000000009e1'$$,
  $$VALUES ('texto de B'::text, 'Evita el agua hoy'::text)$$,
  'con técnica: guarda el texto de la técnica y la nota sin espacios sobrantes');

SELECT is(
  (SELECT client_note FROM public.notifications_aftercare_messages WHERE appointment_id = '00000000-0000-0000-0000-0000000009e2'),
  NULL,
  'una nota de solo espacios queda en NULL');

SELECT is(
  (SELECT aftercare_text FROM public.notifications_aftercare_messages WHERE appointment_id = '00000000-0000-0000-0000-0000000009e3'),
  E'zz-aftercare A\ntexto de A\n\nzz-aftercare B\ntexto de B',
  'con paquete: el texto lleva el nombre de cada técnica como encabezado, en orden');

SELECT throws_ok(
  $$SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009e4', '00000000-0000-0000-0000-0000000009c2',
      '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', repeat('x', 1001))$$,
  'P0001', 'notifications_aftercare_note_too_long', 'una nota de 1001 caracteres se rechaza');

SELECT throws_ok(
  $$SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009e4', '00000000-0000-0000-0000-0000000009c2',
      '00000000-0000-0000-0000-0000000009ff', NULL, 'zz-aftercare B', NULL)$$,
  'P0001', 'notifications_aftercare_text_missing', 'sin texto en el catálogo no se guarda nada');

SELECT throws_ok(
  $$SELECT public.notifications_record_aftercare(NULL, '00000000-0000-0000-0000-0000000009c2',
      '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', NULL)$$,
  'P0001', 'notifications_aftercare_invalid', 'sin cita no se guarda nada');

SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000009c2',
  '00000000-0000-0000-0000-0000000009f2', NULL, 'zz-aftercare A', 'Otra nota');

SELECT is(
  (SELECT count(*)::int FROM public.notifications_aftercare_messages WHERE appointment_id = '00000000-0000-0000-0000-0000000009e1'),
  1, 'repetir la misma cita no duplica la indicación');

SELECT is(
  (SELECT client_note FROM public.notifications_aftercare_messages WHERE appointment_id = '00000000-0000-0000-0000-0000000009e1'),
  'Evita el agua hoy', 'repetir la misma cita no pisa la nota original');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a2","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009e5', '00000000-0000-0000-0000-0000000009c2',
      '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', NULL)$$,
  '42501', NULL, 'authenticated no ejecuta la función que guarda indicaciones');

SELECT results_eq(
  $$SELECT appointment_id FROM public.notifications_aftercare_messages ORDER BY appointment_id$$,
  $$VALUES ('00000000-0000-0000-0000-0000000009e1'::uuid), ('00000000-0000-0000-0000-0000000009e3'::uuid)$$,
  'clienta A ve sus indicaciones y no las de otra');

SELECT is_empty(
  $$SELECT 1 FROM public.notifications_aftercare_messages WHERE client_id = '00000000-0000-0000-0000-0000000009c3'$$,
  'clienta A no ve la indicación de clienta B');

SELECT throws_ok($$SELECT attempts FROM public.notifications_aftercare_messages$$,
  '42501', NULL, 'clienta A no lee los intentos de envío');

SELECT throws_ok($$SELECT last_error FROM public.notifications_aftercare_messages$$,
  '42501', NULL, 'clienta A no lee el error del proveedor');

SELECT throws_ok(
  $$INSERT INTO public.notifications_aftercare_messages (appointment_id, client_id, service_name, aftercare_text)
    VALUES (gen_random_uuid(), '00000000-0000-0000-0000-0000000009c2', 'x', 'y')$$,
  '42501', NULL, 'clienta A no inserta indicaciones directo');

SELECT is_empty(
  $$WITH changed AS (UPDATE public.notifications_aftercare_messages SET status = 'sent' RETURNING id) SELECT id FROM changed$$,
  'clienta A no cambia el estado de un envío: la política no le deja ninguna fila');

SELECT throws_ok($$DELETE FROM public.notifications_aftercare_messages$$,
  '42501', NULL, 'clienta A no borra indicaciones');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT id FROM public.notifications_aftercare_messages$$,
  '42501', NULL, 'anon no lee indicaciones');
SELECT throws_ok(
  $$SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009e5', '00000000-0000-0000-0000-0000000009c2',
      '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', NULL)$$,
  '42501', NULL, 'anon no ejecuta la función que guarda indicaciones');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a1","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.notifications_aftercare_messages), 3,
  'staff ve las indicaciones de todas las clientas');

SELECT lives_ok(
  $$UPDATE public.notifications_aftercare_messages SET status = 'sent', last_channel = 'email', sent_at = now()
     WHERE appointment_id = '00000000-0000-0000-0000-0000000009e2'$$,
  'staff actualiza el estado del envío');
RESET ROLE;

DELETE FROM public.notifications_aftercare_messages;
SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000009c2',
  '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', NULL);
SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009b2', '00000000-0000-0000-0000-0000000009c2',
  '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', NULL);
SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009b3', '00000000-0000-0000-0000-0000000009c2',
  '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', NULL);
SELECT public.notifications_record_aftercare('00000000-0000-0000-0000-0000000009b4', '00000000-0000-0000-0000-0000000009c2',
  '00000000-0000-0000-0000-0000000009f1', NULL, 'zz-aftercare B', NULL);
UPDATE public.notifications_aftercare_messages SET created_at = '2047-10-01 10:00+00'
 WHERE appointment_id = '00000000-0000-0000-0000-0000000009b1';
UPDATE public.notifications_aftercare_messages SET created_at = '2047-10-01 11:00+00'
 WHERE appointment_id = '00000000-0000-0000-0000-0000000009b2';
UPDATE public.notifications_aftercare_messages
   SET created_at = '2047-10-01 09:00+00', status = 'claimed', claimed_at = '2047-10-01 11:55+00'
 WHERE appointment_id = '00000000-0000-0000-0000-0000000009b3';
UPDATE public.notifications_aftercare_messages
   SET created_at = '2047-10-01 08:00+00', status = 'claimed', claimed_at = '2047-10-01 11:30+00'
 WHERE appointment_id = '00000000-0000-0000-0000-0000000009b4';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a2","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_aftercare_messages('2047-10-01 12:00+00', 10, 10)$$,
  '42501', NULL, 'una clienta no reclama indicaciones, ni las suyas');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a1","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.notifications_claim_aftercare_messages('2047-10-01 12:00+00', 0, 10)$$,
  'P0001', NULL, 'una tanda de tamaño 0 se rechaza');

SELECT results_eq(
  $$SELECT appointment_id FROM public.notifications_claim_aftercare_messages('2047-10-01 12:00+00', 2, 10) ORDER BY created_at$$,
  $$VALUES ('00000000-0000-0000-0000-0000000009b4'::uuid), ('00000000-0000-0000-0000-0000000009b1'::uuid)$$,
  'reclama la tanda más antigua: el reclamo vencido vuelve a la fila y el vigente no');
RESET ROLE;

SELECT results_eq(
  $$SELECT status, claimed_at FROM public.notifications_aftercare_messages ORDER BY appointment_id$$,
  $$VALUES ('claimed'::text, '2047-10-01 12:00+00'::timestamptz), ('pending'::text, NULL::timestamptz),
           ('claimed'::text, '2047-10-01 11:55+00'::timestamptz), ('claimed'::text, '2047-10-01 12:00+00'::timestamptz)$$,
  'lo reclamado queda claimed con la hora del reloj, lo vigente conserva la suya y lo demás sigue pending');

SELECT * FROM finish();
ROLLBACK;
