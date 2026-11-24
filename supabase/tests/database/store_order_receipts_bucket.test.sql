-- store_order_receipts_bucket.test.sql
-- US-SHOP-02 · store — el bucket de comprobantes del checkout es privado, acepta imagen o PDF de hasta
-- 1 MB, cada clienta escribe y lee solo en su carpeta (SEC-002: otra clienta con sesión válida no ve
-- ni escribe en la suya), el personal lee todas, y nadie cambia ni borra un comprobante (sin políticas
-- de UPDATE ni DELETE). Todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000021a01', 'order-recibos-admin@test.local'),
  ('00000000-0000-0000-0000-000000021a02', 'order-recibos-clienta-a@test.local'),
  ('00000000-0000-0000-0000-000000021a03', 'order-recibos-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000021a01';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000021c02', '00000000-0000-0000-0000-000000021a02', 'Clienta A', 'order-recibos-clienta-a@test.local', '+50688889002'),
  ('00000000-0000-0000-0000-000000021c03', '00000000-0000-0000-0000-000000021a03', 'Clienta B', 'order-recibos-clienta-b@test.local', '+50688889003');

SELECT is((SELECT public FROM storage.buckets WHERE id = 'store-order-receipts'),
  false, 'el bucket de comprobantes es privado: ningún comprobante tiene URL pública');

SELECT is((SELECT file_size_limit FROM storage.buckets WHERE id = 'store-order-receipts'),
  1048576::bigint, 'el bucket acepta comprobantes de hasta 1 MB, mismo tope que delinquency-receipts');

SELECT is((SELECT allowed_mime_types FROM storage.buckets WHERE id = 'store-order-receipts'),
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  'el bucket solo acepta JPEG, PNG, WebP y PDF');

-- ── La clienta A escribe en su carpeta ─────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000021a02","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('store-order-receipts', '00000000-0000-0000-0000-000000021c02/recibo-1.jpg')$$,
  'la clienta sube un comprobante a su carpeta');

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('store-order-receipts', '00000000-0000-0000-0000-000000021c03/intruso.jpg')$$,
  '42501', NULL, 'la clienta no puede subir a la carpeta de otra clienta');

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('store-order-receipts', 'suelto.jpg')$$,
  '42501', NULL, 'la clienta no puede subir fuera de una carpeta');

SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'store-order-receipts'),
  1, 'la clienta ve su comprobante');

UPDATE storage.objects SET name = '00000000-0000-0000-0000-000000021c02/cambiado.jpg'
 WHERE bucket_id = 'store-order-receipts';

SELECT is((SELECT name FROM storage.objects WHERE bucket_id = 'store-order-receipts'),
  '00000000-0000-0000-0000-000000021c02/recibo-1.jpg',
  'la clienta no puede renombrar su comprobante');

-- ── Otra clienta con sesión válida ─────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000021a03","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'store-order-receipts'),
  0, 'otra clienta no ve el comprobante de la clienta A');

SELECT lives_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('store-order-receipts', '00000000-0000-0000-0000-000000021c03/recibo-b.pdf')$$,
  'la clienta B sube a su propia carpeta');

-- ── El personal ────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000021a01","role":"authenticated"}', true);

-- Contado por carpeta, no por bucket entero: otras pruebas (como la integración de
-- store_checkout contra Supabase local) dejan comprobantes reales en el mismo bucket que no se
-- pueden borrar por SQL directo (Storage lo impide), y un conteo sin filtrar los contaría también.
SELECT is(
  (SELECT count(*)::int FROM storage.objects
    WHERE bucket_id = 'store-order-receipts'
      AND (storage.foldername(name))[1] IN ('00000000-0000-0000-0000-000000021c02', '00000000-0000-0000-0000-000000021c03')),
  2, 'la administradora ve los comprobantes de las dos clientas de esta prueba');

-- Storage impide el DELETE directo en SQL; lo que decide si su API deja borrar o reemplazar son las
-- políticas de UPDATE y DELETE, y este bucket no tiene ninguna.
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'store_order_receipts%' AND cmd IN ('UPDATE', 'DELETE', 'ALL')),
  0, 'nadie puede cambiar ni borrar un comprobante: el bucket no tiene políticas de UPDATE ni DELETE');

SELECT * FROM finish();
ROLLBACK;
