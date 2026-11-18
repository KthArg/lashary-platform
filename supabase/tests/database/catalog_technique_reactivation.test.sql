-- feature catalog — catalog_reactivate_technique(p_technique_id, p_expected_package_ids) y
-- catalog_reactivation_preview(p_technique_id): reactivar una técnica devuelve solo los paquetes que
-- la cascada desactivó, si todas sus técnicas están activas. Un paquete apagado a mano nunca vuelve.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(27);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'reactivacion-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'reactivacion-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000e1';

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
VALUES
  ('00000000-0000-0000-0000-00000000e001', 'zz-test reac suelta', 'lash_classic', 20000, 60, 4000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e002', 'zz-test reac compartida', 'brow_design', 10000, 45, 2000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e003', 'zz-test reac paquete a', 'henna', 8000, 30, 1000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e004', 'zz-test reac paquete b', 'waxing', 6000, 20, 1000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e005', 'zz-test reac manual', 'lips', 9000, 40, 1000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e006', 'zz-test reac bloqueada', 'lash_volume', 9000, 40, 1000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e007', 'zz-test reac bloqueadora', 'lash_extra_volume', 9000, 40, 1000, 'cuidados'),
  ('00000000-0000-0000-0000-00000000e008', 'zz-test reac manual 2', 'brow_lamination', 9000, 40, 1000, 'cuidados');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

SELECT public.catalog_save_package(
  '00000000-0000-0000-0000-00000000d201', 'zz-test reac paquete A', 30000, true,
  ARRAY['00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000e003']::uuid[]);
SELECT public.catalog_save_package(
  '00000000-0000-0000-0000-00000000d202', 'zz-test reac paquete B', 25000, true,
  ARRAY['00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000e004']::uuid[]);
-- Paquete C: nunca estuvo activo por cascada; reactivar una técnica no debe tocarlo.
SELECT public.catalog_save_package(
  '00000000-0000-0000-0000-00000000d203', 'zz-test reac paquete C inactivo', 15000, false,
  ARRAY['00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-00000000e004']::uuid[]);
SELECT public.catalog_save_package(
  '00000000-0000-0000-0000-00000000d204', 'zz-test reac paquete manual', 12000, true,
  ARRAY['00000000-0000-0000-0000-00000000e005', '00000000-0000-0000-0000-00000000e008']::uuid[]);
SELECT public.catalog_save_package(
  '00000000-0000-0000-0000-00000000d205', 'zz-test reac paquete bloqueado', 14000, true,
  ARRAY['00000000-0000-0000-0000-00000000e006', '00000000-0000-0000-0000-00000000e007']::uuid[]);

-- ── Técnica sin paquetes: desactivar y reactivar no toca ningún paquete ────────────────────────
SELECT is(
  (SELECT deactivated_package_ids FROM public.catalog_deactivate_technique_cascade(
    '00000000-0000-0000-0000-00000000e001', ARRAY[]::uuid[])),
  ARRAY[]::uuid[],
  'técnica sin paquetes: la desactivación no afecta paquetes');
SELECT is(
  (SELECT reactivated_package_ids FROM public.catalog_reactivate_technique(
    '00000000-0000-0000-0000-00000000e001', ARRAY[]::uuid[])),
  ARRAY[]::uuid[],
  'técnica sin paquetes: la reactivación no reactiva paquetes');
SELECT is(
  (SELECT is_active FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000e001'),
  true, 'la técnica sin paquetes vuelve a estar activa');

-- ── Cascada a dos paquetes, luego reactivación ────────────────────────────────────────────────
SELECT is(
  (SELECT deactivated_package_ids FROM public.catalog_deactivate_technique_cascade(
    '00000000-0000-0000-0000-00000000e002',
    ARRAY['00000000-0000-0000-0000-00000000d201', '00000000-0000-0000-0000-00000000d202']::uuid[])),
  ARRAY['00000000-0000-0000-0000-00000000d201', '00000000-0000-0000-0000-00000000d202']::uuid[],
  'cascada: desactiva los dos paquetes que incluyen la técnica');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_packages
    WHERE id IN ('00000000-0000-0000-0000-00000000d201', '00000000-0000-0000-0000-00000000d202')
      AND is_active),
  0, 'cascada: ambos paquetes quedan inactivos');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_cascade_deactivations
    WHERE technique_id = '00000000-0000-0000-0000-00000000e002'),
  2, 'cascada: registra qué paquetes apagó');

SELECT is(
  (SELECT array_agg(package_id ORDER BY package_id) FROM public.catalog_reactivation_preview(
    '00000000-0000-0000-0000-00000000e002')),
  ARRAY['00000000-0000-0000-0000-00000000d201', '00000000-0000-0000-0000-00000000d202']::uuid[],
  'vista previa: lista los dos paquetes que volverían');

-- Lista esperada desactualizada: rechaza y no cambia nada.
SELECT throws_ok(
  $$SELECT public.catalog_reactivate_technique(
      '00000000-0000-0000-0000-00000000e002', ARRAY[]::uuid[])$$,
  '40001', 'catalog_affected_packages_changed',
  'lista equivocada: rechaza en vez de reactivar algo que ya no es lo mostrado');
SELECT is(
  (SELECT is_active FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000e002'),
  false, 'atómico: la técnica sigue inactiva tras el rechazo');

SELECT is(
  (SELECT reactivated_package_ids FROM public.catalog_reactivate_technique(
    '00000000-0000-0000-0000-00000000e002',
    ARRAY['00000000-0000-0000-0000-00000000d201', '00000000-0000-0000-0000-00000000d202']::uuid[])),
  ARRAY['00000000-0000-0000-0000-00000000d201', '00000000-0000-0000-0000-00000000d202']::uuid[],
  'reactivación: devuelve los dos paquetes reactivados');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_packages
    WHERE id IN ('00000000-0000-0000-0000-00000000d201', '00000000-0000-0000-0000-00000000d202')
      AND is_active),
  2, 'reactivación: ambos paquetes vuelven a estar activos');
SELECT is(
  (SELECT is_active FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d203'),
  false, 'el paquete que nunca fue cascada sigue inactivo');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_cascade_deactivations
    WHERE technique_id = '00000000-0000-0000-0000-00000000e002'),
  0, 'reactivación: consume las marcas de la cascada');

-- ── Paquete apagado a mano después de la cascada no vuelve ────────────────────────────────────
SELECT is(
  (SELECT deactivated_package_ids FROM public.catalog_deactivate_technique_cascade(
    '00000000-0000-0000-0000-00000000e005',
    ARRAY['00000000-0000-0000-0000-00000000d204']::uuid[])),
  ARRAY['00000000-0000-0000-0000-00000000d204']::uuid[],
  'manual: cascada desactiva el paquete del caso manual');
UPDATE public.catalog_packages SET is_active = true WHERE id = '00000000-0000-0000-0000-00000000d204';
UPDATE public.catalog_packages SET is_active = false WHERE id = '00000000-0000-0000-0000-00000000d204';
SELECT is(
  (SELECT count(*)::int FROM public.catalog_cascade_deactivations
    WHERE package_id = '00000000-0000-0000-0000-00000000d204'),
  0, 'manual: un cambio manual del paquete borra su marca de cascada');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_reactivation_preview('00000000-0000-0000-0000-00000000e005')),
  0, 'manual: la vista previa no lo incluye');
SELECT is(
  (SELECT reactivated_package_ids FROM public.catalog_reactivate_technique(
    '00000000-0000-0000-0000-00000000e005', ARRAY[]::uuid[])),
  ARRAY[]::uuid[],
  'manual: reactivar la técnica no reactiva el paquete apagado a mano');
SELECT is(
  (SELECT is_active FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d204'),
  false, 'manual: el paquete sigue inactivo');

-- ── Paquete bloqueado por otra técnica inactiva ───────────────────────────────────────────────
SELECT is(
  (SELECT deactivated_package_ids FROM public.catalog_deactivate_technique_cascade(
    '00000000-0000-0000-0000-00000000e006',
    ARRAY['00000000-0000-0000-0000-00000000d205']::uuid[])),
  ARRAY['00000000-0000-0000-0000-00000000d205']::uuid[],
  'bloqueo: cascada desactiva el paquete de e006');
SELECT is(
  (SELECT deactivated_package_ids FROM public.catalog_deactivate_technique_cascade(
    '00000000-0000-0000-0000-00000000e007', ARRAY[]::uuid[])),
  ARRAY[]::uuid[],
  'bloqueo: desactivar e007 no encuentra paquetes activos que afectar');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_reactivation_preview('00000000-0000-0000-0000-00000000e006')),
  0, 'bloqueo: la vista previa de e006 no incluye el paquete, e007 sigue inactiva');
SELECT is(
  (SELECT reactivated_package_ids FROM public.catalog_reactivate_technique(
    '00000000-0000-0000-0000-00000000e006', ARRAY[]::uuid[])),
  ARRAY[]::uuid[],
  'bloqueo: reactivar e006 no reactiva el paquete mientras e007 esté inactiva');
SELECT is(
  (SELECT count(*)::int FROM public.catalog_cascade_deactivations
    WHERE package_id = '00000000-0000-0000-0000-00000000d205'),
  1, 'bloqueo: la marca del paquete se conserva para cuando vuelva e007');
SELECT is(
  (SELECT reactivated_package_ids FROM public.catalog_reactivate_technique(
    '00000000-0000-0000-0000-00000000e007',
    ARRAY['00000000-0000-0000-0000-00000000d205']::uuid[])),
  ARRAY['00000000-0000-0000-0000-00000000d205']::uuid[],
  'bloqueo: al reactivar e007 vuelve el paquete');
SELECT is(
  (SELECT is_active FROM public.catalog_packages WHERE id = '00000000-0000-0000-0000-00000000d205'),
  true, 'bloqueo: el paquete queda activo con todas sus técnicas activas');

-- ── Usuaria que no es staff ───────────────────────────────────────────────────────────────────
SELECT public.catalog_deactivate_technique_cascade(
  '00000000-0000-0000-0000-00000000e001', ARRAY[]::uuid[]);
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.catalog_reactivate_technique(
      '00000000-0000-0000-0000-00000000e001', ARRAY[]::uuid[])$$,
  '42501', NULL,
  'no staff: no puede reactivar una técnica');
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
SELECT is(
  (SELECT is_active FROM public.catalog_techniques WHERE id = '00000000-0000-0000-0000-00000000e001'),
  false, 'no staff: la técnica sigue inactiva');

SELECT * FROM finish();
ROLLBACK;
