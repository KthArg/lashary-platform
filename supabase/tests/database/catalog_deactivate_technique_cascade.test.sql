-- feature catalog — catalog_deactivate_technique_cascade(p_technique_id, p_expected_package_ids):
-- desactivar una técnica también desactiva los paquetes activos que la incluyen, atómicamente, y
-- rechaza si la lista de paquetes afectados cambió desde que se mostró el aviso (concurrencia,
-- mismo criterio que scheduling_cancel_appointment con el anticipo esperado).
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'cascada-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'cascada-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000c1';

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
VALUES
  ('00000000-0000-0000-0000-00000000f001', 'zz-test cascada suelta', 'lash_classic', 20000, 60, 4000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000f002', 'zz-test cascada compartida', 'brow_design', 10000, 45, 2000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000f003', 'zz-test cascada paquete a', 'henna', 8000, 30, 1000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000f004', 'zz-test cascada paquete b', 'waxing', 6000, 20, 1000, 'cuidados');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

-- Paquete A: comparte f002 con el paquete B (para probar la cascada a dos paquetes a la vez).
SELECT public.catalog_save_package(
  '00000000-0000-0000-0000-00000000d101', 'zz-test paquete cascada a', 30000, true,
  ARRAY['00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000f003']::uuid[]);
SELECT public.catalog_save_package(
  '00000000-0000-0000-0000-00000000d102', 'zz-test paquete cascada b', 25000, true,
  ARRAY['00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000f004']::uuid[]);
-- Paquete C: ya estaba inactivo antes de tocar nada; no debe aparecer como afectado.
SELECT public.catalog_save_package(
  '00000000-0000-0000-0000-00000000d103', 'zz-test paquete cascada ya inactivo', 15000, false,
  ARRAY['00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000f004']::uuid[]);

-- ── Técnica sin ningún paquete: se desactiva sola, sin ningún efecto secundario ────────────────
SELECT is(
  (SELECT deactivated_package_ids FROM public.catalog_deactivate_technique_cascade(
    '00000000-0000-0000-0000-00000000f001', ARRAY[]::uuid[])),
  ARRAY[]::uuid[],
  'técnica sin paquetes: no desactiva ningún paquete');
SELECT is(
  (SELECT is_active FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000f001'),
  false, 'la técnica sin paquetes queda desactivada');

-- ── Lista esperada incorrecta: rechaza, nada cambia ─────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.catalog_deactivate_technique_cascade(
      '00000000-0000-0000-0000-00000000f002', ARRAY[]::uuid[])$$,
  '40001', 'catalog_affected_packages_changed',
  'lista de paquetes afectados equivocada: rechaza en vez de aplicar un aviso que ya no es cierto');
SELECT is(
  (SELECT is_active FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000f002'),
  true, 'atómico: la técnica sigue activa tras el rechazo');
SELECT is(
  (SELECT is_active FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d101'),
  true, 'atómico: el paquete A sigue activo tras el rechazo');

-- ── Lista esperada correcta, dos paquetes activos: cascada a los dos ────────────────────────────
SELECT is(
  (SELECT deactivated_package_ids FROM public.catalog_deactivate_technique_cascade(
    '00000000-0000-0000-0000-00000000f002',
    ARRAY['00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-00000000d102']::uuid[])),
  ARRAY['00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-00000000d102']::uuid[],
  'técnica compartida por dos paquetes: devuelve los dos ids desactivados');
SELECT is(
  (SELECT is_active FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000f002'),
  false, 'la técnica compartida queda desactivada');
SELECT is(
  (SELECT is_active FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d101'),
  false, 'el paquete A queda desactivado');
SELECT is(
  (SELECT is_active FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d102'),
  false, 'el paquete B queda desactivado');
SELECT is(
  (SELECT is_active FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d103'),
  false, 'el paquete ya inactivo sigue inactivo, sin aparecer en la cascada');

-- ── anon no puede llamarla ───────────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$SELECT public.catalog_deactivate_technique_cascade(
      '00000000-0000-0000-0000-00000000f003', ARRAY[]::uuid[])$$,
  '42501', NULL, 'anónimo: no ejecuta la función');

-- ── una clienta (no staff) tampoco puede: la RLS de escritura la detiene, no esta función ──────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.catalog_deactivate_technique_cascade(
      '00000000-0000-0000-0000-00000000f003', ARRAY[]::uuid[])$$,
  '42501', NULL, 'clienta sin rol de staff: la política de catalog_techniques la detiene');

RESET ROLE;

SELECT is(
  (SELECT is_active FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000f003'),
  true, 'intentos sin permiso no dejaron la técnica desactivada');

SELECT * FROM finish();
ROLLBACK;
