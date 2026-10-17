BEGIN;
SELECT plan(24);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000004a1', 'record-admin@test.local'),
  ('00000000-0000-0000-0000-0000000004a2', 'record-clienta@test.local'),
  ('00000000-0000-0000-0000-0000000004a3', 'record-expediente@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000004a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000004c1', '00000000-0000-0000-0000-0000000004a3',
   'Clienta con expediente', 'record-expediente@test.local', '+50680000001'),
  ('00000000-0000-0000-0000-0000000004c2', '00000000-0000-0000-0000-0000000004a2',
   'Clienta curiosa', 'record-clienta@test.local', '+50680000002');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004a1","role":"authenticated"}', true);

SELECT is(public.auth_is_admin(), true, 'admin: auth_is_admin() es verdadero');

SELECT results_eq(
  $$SELECT name FROM public.clients_precaution_categories ORDER BY name$$,
  $$VALUES ('Alergia'::text), ('Condición relevante'::text), ('Sensibilidad'::text)$$,
  'la migración trae las tres categorías del criterio 2');

SELECT lives_ok(
  $$INSERT INTO public.clients_precaution_categories (name, created_by)
    VALUES ('Medicamento', '00000000-0000-0000-0000-0000000004a1')$$,
  'admin: crea una categoría nueva');

SELECT throws_ok(
  $$INSERT INTO public.clients_precaution_categories (name, created_by)
    VALUES ('ALERGIA', '00000000-0000-0000-0000-0000000004a1')$$,
  '23505', NULL, 'una categoría no se repite aunque cambien las mayúsculas');

SELECT throws_ok(
  $$INSERT INTO public.clients_precaution_categories (name, created_by)
    VALUES (' Alergia ', '00000000-0000-0000-0000-0000000004a1')$$,
  '23514', NULL, 'una categoría no se guarda con espacios al borde');

SELECT throws_ok(
  $$INSERT INTO public.clients_precaution_categories (name, created_by)
    VALUES ('Firmada por otra', '00000000-0000-0000-0000-0000000004a2')$$,
  '42501', NULL, 'admin: no crea una categoría a nombre de otra persona');

SELECT lives_ok(
  $$INSERT INTO public.clients_record_versions
      (id, client_id, change_kind, study_text, recommended_technique_id,
       recommended_technique_name, precautions, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004f1', '00000000-0000-0000-0000-0000000004c1',
            'initial', 'Pestaña natural fina y corta',
            '00000000-0000-0000-0000-0000000004e1', 'Clásicas',
            '[{"categoryName":"Alergia","description":"Cianoacrilato estándar"}]',
            '00000000-0000-0000-0000-0000000004a1')$$,
  'admin: registra el estudio inicial');

SELECT throws_ok(
  $$INSERT INTO public.clients_record_versions (client_id, change_kind, study_text, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004c1', 'initial', 'Otro estudio',
            '00000000-0000-0000-0000-0000000004a1')$$,
  '23505', NULL, 'una clienta no tiene dos registros iniciales');

SELECT lives_ok(
  $$INSERT INTO public.clients_record_versions
      (id, client_id, previous_version_id, change_kind, study_text, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004f2', '00000000-0000-0000-0000-0000000004c1',
            '00000000-0000-0000-0000-0000000004f1', 'study_edited',
            'Pestaña natural fina, corta y escasa', '00000000-0000-0000-0000-0000000004a1')$$,
  'admin: agrega una versión sobre la vigente');

SELECT throws_ok(
  $$INSERT INTO public.clients_record_versions
      (client_id, previous_version_id, change_kind, study_text, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004c1', '00000000-0000-0000-0000-0000000004f1',
            'study_edited', 'Cambio hecho a la vez', '00000000-0000-0000-0000-0000000004a1')$$,
  '23505', NULL, 'dos versiones no pueden salir de la misma anterior');

SELECT throws_ok(
  $$INSERT INTO public.clients_record_versions
      (client_id, previous_version_id, change_kind, study_text, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004c2', '00000000-0000-0000-0000-0000000004f2',
            'study_edited', 'Versión cruzada', '00000000-0000-0000-0000-0000000004a1')$$,
  '23503', NULL, 'una versión no continúa el expediente de otra clienta');

SELECT throws_ok(
  $$INSERT INTO public.clients_record_versions (client_id, change_kind, study_text, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004c2', 'study_edited', 'Sin anterior',
            '00000000-0000-0000-0000-0000000004a1')$$,
  '23514', NULL, 'solo el registro inicial puede no tener versión anterior');

SELECT throws_ok(
  $$INSERT INTO public.clients_record_versions
      (client_id, change_kind, study_text, recommended_technique_id, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004c2', 'initial', 'Técnica sin nombre',
            '00000000-0000-0000-0000-0000000004e1', '00000000-0000-0000-0000-0000000004a1')$$,
  '23514', NULL, 'la técnica recomendada guarda id y nombre juntos');

SELECT throws_ok(
  $$INSERT INTO public.clients_record_versions (client_id, change_kind, study_text, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004c2', 'initial', 'Firmado por otra',
            '00000000-0000-0000-0000-0000000004a2')$$,
  '42501', NULL, 'admin: no registra una versión a nombre de otra persona');

UPDATE public.clients_record_versions SET study_text = 'alterado'
 WHERE id = '00000000-0000-0000-0000-0000000004f1';
DELETE FROM public.clients_record_versions
 WHERE id = '00000000-0000-0000-0000-0000000004f2';
UPDATE public.clients_precaution_categories SET name = 'Alterada' WHERE name = 'Alergia';
DELETE FROM public.clients_precaution_categories WHERE name = 'Medicamento';

SELECT is(
  (SELECT study_text FROM public.clients_record_versions
    WHERE id = '00000000-0000-0000-0000-0000000004f1'),
  'Pestaña natural fina y corta',
  'admin: UPDATE no cambia una versión ya guardada');

SELECT is(
  (SELECT count(*)::int FROM public.clients_record_versions
    WHERE client_id = '00000000-0000-0000-0000-0000000004c1'),
  2, 'admin: DELETE no borra versiones del historial');

SELECT is(
  (SELECT count(*)::int FROM public.clients_precaution_categories
    WHERE name IN ('Alergia', 'Medicamento')),
  2, 'admin: las categorías no se renombran ni se borran');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004a2","role":"authenticated"}', true);

SELECT is(public.auth_is_admin(), false, 'clienta: auth_is_admin() es falso');

SELECT is(
  (SELECT count(*)::int FROM public.clients_record_versions),
  0, 'clienta: no lee el expediente de otra clienta');

SELECT is(
  (SELECT count(*)::int FROM public.clients_precaution_categories),
  0, 'clienta: no lee las categorías');

SELECT throws_ok(
  $$INSERT INTO public.clients_record_versions (client_id, change_kind, study_text, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004c2', 'initial', 'Escrito por la clienta',
            '00000000-0000-0000-0000-0000000004a2')$$,
  '42501', NULL, 'clienta: no escribe un expediente, ni siquiera el suyo');

SELECT throws_ok(
  $$INSERT INTO public.clients_precaution_categories (name, created_by)
    VALUES ('Categoría de la clienta', '00000000-0000-0000-0000-0000000004a2')$$,
  '42501', NULL, 'clienta: no crea categorías');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.clients_record_versions),
  0, 'anon: no lee ningún expediente');

SELECT throws_ok(
  $$INSERT INTO public.clients_record_versions (client_id, change_kind, study_text, created_by)
    VALUES ('00000000-0000-0000-0000-0000000004c2', 'initial', 'Escrito sin sesión',
            '00000000-0000-0000-0000-0000000004a1')$$,
  '42501', NULL, 'anon: no escribe un expediente');

SELECT * FROM finish();
ROLLBACK;
