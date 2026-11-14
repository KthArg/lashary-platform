-- notifications_reapplication_settings.test.sql
-- US-NOT-05 · feature notifications — criterio 3: la anticipación nace en 7 días y nadie la cambia
-- directo, ni la administradora (solo la función de una pieza posterior); staff lee y no escribe
-- directo; la clienta no ve nada y anon no tiene permiso.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(7);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'reap-settings-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'reap-settings-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000e1';

-- ── Como admin ─────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT anticipation_days FROM public.notifications_reapplication_settings),
  7, 'la anticipación arranca en 7 días, valor aprobado por el líder del proyecto');

SELECT throws_ok(
  $$UPDATE public.notifications_reapplication_settings SET anticipation_days = 14$$,
  '42501', NULL, 'ni la administradora cambia la anticipación directo: va por la función, que deja bitácora');

-- ── Como la clienta ────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.notifications_reapplication_settings),
  0, 'la clienta no ve la configuración: la RLS la oculta');

SELECT throws_ok(
  $$UPDATE public.notifications_reapplication_settings SET anticipation_days = 30$$,
  '42501', NULL, 'la clienta no puede cambiar la anticipación');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT anticipation_days FROM public.notifications_reapplication_settings),
  7, 'la anticipación sigue en 7: nadie la cambió directo');

-- ── Como anon ────────────────────────────────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.notifications_reapplication_settings$$,
  '42501', NULL, 'anon: no lee la configuración');

-- ── Restricción de rango (como dueño, sin rol de sesión) ───────────────────────
RESET ROLE;
SELECT throws_ok(
  $$UPDATE public.notifications_reapplication_settings SET anticipation_days = 31$$,
  '23514', NULL, 'el rango 1-30 se aplica aunque se escriba como dueño');

SELECT * FROM finish();
ROLLBACK;
