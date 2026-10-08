ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS existencias INTEGER NOT NULL DEFAULT 0
  CONSTRAINT store_products_existencias_no_negativas CHECK (existencias >= 0);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-product-images',
  'store-product-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "store_product_images_select_admin" ON storage.objects;
CREATE POLICY "store_product_images_select_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'store-product-images'
  AND EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "store_product_images_insert_admin" ON storage.objects;
CREATE POLICY "store_product_images_insert_admin"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-product-images'
  AND EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "store_product_images_update_admin" ON storage.objects;
CREATE POLICY "store_product_images_update_admin"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-product-images'
  AND EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  bucket_id = 'store-product-images'
  AND EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "store_product_images_delete_admin" ON storage.objects;
CREATE POLICY "store_product_images_delete_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-product-images'
  AND EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
);
