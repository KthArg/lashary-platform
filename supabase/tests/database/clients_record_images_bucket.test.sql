BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000005a1', 'record-images-admin@test.local'),
  ('00000000-0000-0000-0000-0000000005a2', 'record-images-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000005a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005a2',
        'Clienta con fotos', 'record-images-clienta@test.local', '+50680000005');

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'clients-record-images'),
  false, 'el bucket del expediente es privado: sus imágenes no tienen URL pública');

SELECT is(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'clients-record-images'),
  1048576::bigint, 'el bucket acepta imágenes de hasta 1 MB');

SELECT is(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'clients-record-images'),
  ARRAY['image/jpeg', 'image/png', 'image/webp'],
  'el bucket solo acepta JPEG, PNG y WebP');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a1","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('clients-record-images', '00000000-0000-0000-0000-0000000005c1/estudio.jpg')$$,
  'admin: sube una imagen a la carpeta de una clienta');

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('clients-record-images', '00000000-0000-0000-0000-0000000005ff/estudio.jpg')$$,
  '42501', NULL, 'admin: no sube una imagen a la carpeta de una clienta que no existe');

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('clients-record-images', 'suelta.jpg')$$,
  '42501', NULL, 'admin: no sube una imagen fuera de la carpeta de una clienta');

SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'clients-record-images'),
  1, 'admin: ve la imagen que subió');

UPDATE storage.objects SET name = '00000000-0000-0000-0000-0000000005c1/renombrada.jpg'
 WHERE bucket_id = 'clients-record-images';

SELECT is(
  (SELECT name FROM storage.objects WHERE bucket_id = 'clients-record-images'),
  '00000000-0000-0000-0000-0000000005c1/estudio.jpg',
  'admin: una imagen del expediente no se renombra');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a2","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'clients-record-images'),
  0, 'clienta: no ve las imágenes de su propio expediente');

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('clients-record-images', '00000000-0000-0000-0000-0000000005c1/propia.jpg')$$,
  '42501', NULL, 'clienta: no sube imágenes, ni siquiera a su carpeta');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'clients-record-images'),
  0, 'anon: no ve ninguna imagen del expediente');

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('clients-record-images', '00000000-0000-0000-0000-0000000005c1/anonima.jpg')$$,
  '42501', NULL, 'anon: no sube imágenes');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'clients_record_images_%'
      AND cmd IN ('UPDATE', 'DELETE')),
  0, 'el bucket no tiene políticas de UPDATE ni DELETE');

SELECT * FROM finish();
ROLLBACK;
