-- US-AGE-13: conservar exoneraciones activas e históricas (ADR-0009).
-- Ejecutar con npx supabase test db. Fixtures locales y ROLLBACK; sin claves de servicio.
BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000f001', 'historial-admin@test.local'),
  ('00000000-0000-0000-0000-00000000f002', 'historial-clienta@test.local');
INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone) VALUES
  ('00000000-0000-0000-0000-00000000f101',
   '00000000-0000-0000-0000-00000000f002', 'Exoneración activa', 'activa@test.local', '00000000001'),
  ('00000000-0000-0000-0000-00000000f102',
   NULL, 'Exoneración histórica', 'historica@test.local', '00000000002'),
  ('00000000-0000-0000-0000-00000000f103',
   NULL, 'Sin exoneración', 'sin-exoneracion@test.local', '00000000003');
INSERT INTO public.payments_deposit_exemptions (id, client_id, exempted_by, reason, active) VALUES
  ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-00000000f101',
   '00000000-0000-0000-0000-00000000f001', 'Acuerdo vigente', true),
  ('00000000-0000-0000-0000-00000000f202', '00000000-0000-0000-0000-00000000f102',
   '00000000-0000-0000-0000-00000000f001', 'Acuerdo anterior', false);

-- El dueño de la base omite RLS: la FK debe proteger incluso un borrado privilegiado.
SELECT throws_ok(
  $$DELETE FROM public.clients_profiles WHERE id = '00000000-0000-0000-0000-00000000f101'$$,
  '23503', NULL, 'bloquea el borrado con una exoneración activa');
SELECT is((SELECT count(*)::int FROM public.clients_profiles
  WHERE id = '00000000-0000-0000-0000-00000000f101'), 1, 'conserva el perfil con exoneración activa');
SELECT is((SELECT reason FROM public.payments_deposit_exemptions
  WHERE id = '00000000-0000-0000-0000-00000000f201'),
  'Acuerdo vigente', 'conserva el contenido de la exoneración activa');

SELECT throws_ok(
  $$DELETE FROM public.clients_profiles WHERE id = '00000000-0000-0000-0000-00000000f102'$$,
  '23503', NULL, 'bloquea el borrado con una exoneración inactiva');
SELECT is((SELECT count(*)::int FROM public.clients_profiles
  WHERE id = '00000000-0000-0000-0000-00000000f102'), 1, 'conserva el perfil con historial');
SELECT is((SELECT reason FROM public.payments_deposit_exemptions
  WHERE id = '00000000-0000-0000-0000-00000000f202'),
  'Acuerdo anterior', 'conserva el contenido de la exoneración histórica');

-- auth.users también tiene CASCADE hacia clients_profiles: no debe eludir la protección.
SELECT throws_ok(
  $$DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-00000000f002'$$,
  '23503', NULL, 'bloquea el borrado indirecto desde la cuenta de autenticación');
SELECT is((SELECT count(*)::int FROM auth.users
  WHERE id = '00000000-0000-0000-0000-00000000f002'), 1, 'conserva la cuenta tras el intento');
SELECT is((SELECT count(*)::int FROM public.clients_profiles
  WHERE id = '00000000-0000-0000-0000-00000000f101'), 1, 'conserva el perfil tras el intento indirecto');
SELECT is((SELECT active FROM public.payments_deposit_exemptions
  WHERE id = '00000000-0000-0000-0000-00000000f201'), true, 'conserva la exoneración tras el intento indirecto');

SELECT lives_ok(
  $$DELETE FROM public.clients_profiles WHERE id = '00000000-0000-0000-0000-00000000f103'$$,
  'la FK no bloquea perfiles sin exoneraciones');
SELECT is((SELECT count(*)::int FROM public.clients_profiles
  WHERE id = '00000000-0000-0000-0000-00000000f103'), 0, 'el perfil sin referencias se elimina');
SELECT throws_ok(
  $$INSERT INTO public.payments_deposit_exemptions (client_id, exempted_by, reason)
    VALUES ('00000000-0000-0000-0000-00000000ffff',
            '00000000-0000-0000-0000-00000000f001', 'Sin perfil')$$,
  '23503', NULL, 'sigue rechazando exoneraciones huérfanas');
SELECT lives_ok(
  $$UPDATE public.clients_profiles SET full_name = 'Nombre corregido'
    WHERE id = '00000000-0000-0000-0000-00000000f101'$$,
  'permite editar el perfil conservado');
SELECT is((SELECT full_name FROM public.clients_profiles
  WHERE id = '00000000-0000-0000-0000-00000000f101'), 'Nombre corregido', 'la edición se conserva');
SELECT is((SELECT relrowsecurity FROM pg_class
  WHERE oid = 'public.payments_deposit_exemptions'::regclass), true, 'RLS continúa habilitado');

SELECT * FROM finish();
ROLLBACK;
