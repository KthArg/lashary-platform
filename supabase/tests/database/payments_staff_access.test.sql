-- payments_staff_access.test.sql
-- US-AGE-13 · feature payments — control positivo de acceso de staff (SEC-001) sobre
-- payments_deposit_exemptions, y que nadie — ni siquiera staff — puede UPDATE/DELETE (sin
-- política todavía: levantar una exoneración es una historia futura, no el criterio 5 de
-- US-AGE-13).
--
-- Complementa src/features/payments/__tests__/rls-isolation.test.ts (SEC-002), que prueba el
-- control negativo (anon y clienta no leen ni escriben). El rol se siembra como superusuario
-- local dentro de la transacción; no se usa la service-role key (SEC-003) y todo se deshace
-- con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(10);

-- Tres identidades: admin y clienta prueban el RLS de la tabla; la tercera es la clienta
-- exonerada — solo necesita existir en clients_profiles para satisfacer la FK de client_id.
INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'payments-staff-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'payments-clienta@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'payments-exonerada@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000d1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-0000000000d3',
        'Clienta de prueba', 'payments-exonerada@test.local', '00000000000');

-- ── Como admin ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), true, 'admin: auth_is_staff() es true');

SELECT lives_ok(
  $$INSERT INTO public.payments_deposit_exemptions (id, client_id, exempted_by, reason)
    VALUES ('00000000-0000-0000-0000-00000000e101',
            '00000000-0000-0000-0000-00000000cc01',
            '00000000-0000-0000-0000-0000000000d1',
            'caso especial de prueba')$$,
  'admin: INSERT permitido');

SELECT is(
  (SELECT count(*)::int FROM public.payments_deposit_exemptions
    WHERE id = '00000000-0000-0000-0000-00000000e101'),
  1, 'admin: la fila insertada existe');

SELECT is(
  (SELECT count(*)::int FROM public.payments_deposit_exemptions
    WHERE id = '00000000-0000-0000-0000-00000000e101'),
  1, 'admin: SELECT ve la fila que insertó');

-- Sin política de UPDATE/DELETE, RLS no lanza error (a diferencia de INSERT): el USING
-- implícito es "false" y el WHERE no encuentra ninguna fila. Por eso no se envuelve en
-- throws_ok — se corre el intento y se verifica que no tuvo efecto.
UPDATE public.payments_deposit_exemptions SET reason = 'alterado'
 WHERE id = '00000000-0000-0000-0000-00000000e101';

DELETE FROM public.payments_deposit_exemptions
 WHERE id = '00000000-0000-0000-0000-00000000e101';

SELECT is(
  (SELECT reason FROM public.payments_deposit_exemptions
    WHERE id = '00000000-0000-0000-0000-00000000e101'),
  'caso especial de prueba',
  'admin: UPDATE y DELETE no tuvieron efecto — sin política todavía (levantar es historia futura)');

-- ── Como clienta (contraste: la misma tabla, sin rol de staff) ──────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), false, 'clienta: auth_is_staff() es false');

SELECT is(
  (SELECT count(*)::int FROM public.payments_deposit_exemptions),
  0, 'clienta: SELECT no ve ninguna fila');

SELECT throws_ok(
  $$INSERT INTO public.payments_deposit_exemptions (client_id, exempted_by, reason)
    VALUES ('00000000-0000-0000-0000-00000000cc01',
            '00000000-0000-0000-0000-0000000000d2', 'rls probe')$$,
  '42501', NULL, 'clienta: INSERT denegado por RLS');

UPDATE public.payments_deposit_exemptions SET reason = 'alterado'
 WHERE id = '00000000-0000-0000-0000-00000000e101';

DELETE FROM public.payments_deposit_exemptions
 WHERE id = '00000000-0000-0000-0000-00000000e101';

-- Clienta no tiene política de SELECT: se vuelve a la sesión de admin para verificar el efecto
-- de sus propios intentos.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.payments_deposit_exemptions
    WHERE id = '00000000-0000-0000-0000-00000000e101'),
  1, 'clienta: su UPDATE y su DELETE no tuvieron efecto — la fila sigue ahí');

SELECT is(
  (SELECT reason FROM public.payments_deposit_exemptions
    WHERE id = '00000000-0000-0000-0000-00000000e101'),
  'caso especial de prueba', 'clienta: y su contenido no cambió');

SELECT * FROM finish();
ROLLBACK;
