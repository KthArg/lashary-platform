-- scheduling_manual_blocks_reason_length.test.sql
-- US-AGE-07 · feature scheduling — el motivo de un bloqueo manual llega hasta 500 caracteres; uno
-- más largo lo rechaza la base aunque no pase por la UI ni por el dominio.
--
-- El rol se siembra como superusuario local dentro de la transacción; no se usa la service-role
-- key (SEC-003) y todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(3);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000007a2', 'scheduling-reason-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000007a2';

INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-4000-8000-0000000007f2', 'zz-test recurso motivo');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a2","role":"authenticated"}', true);

SELECT lives_ok(
  format($$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at, reason)
           VALUES ('00000000-0000-4000-8000-0000000007f2', '2026-10-19 15:00Z', '2026-10-19 16:00Z', %L)$$,
         repeat('a', 500)),
  'admin: un motivo de 500 caracteres se guarda');

SELECT throws_ok(
  format($$INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at, reason)
           VALUES ('00000000-0000-4000-8000-0000000007f2', '2026-10-19 17:00Z', '2026-10-19 18:00Z', %L)$$,
         repeat('a', 501)),
  '23514', NULL,
  'base: un motivo de 501 caracteres se rechaza');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_manual_blocks
    WHERE resource_id = '00000000-0000-4000-8000-0000000007f2'),
  1, 'base: solo quedó el bloqueo con el motivo dentro del tope');

SELECT * FROM finish();
ROLLBACK;
