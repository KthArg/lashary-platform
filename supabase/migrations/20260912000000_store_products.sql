-- Catálogo de productos públicos y administración base del stock (ARCH-006, DOM-009)
CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    url_imagen TEXT NOT NULL,
    precio_crc INTEGER NOT NULL CHECK (precio_crc >= 0),
    activo BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_store_products_activo_sort_order ON public.store_products (activo, sort_order, created_at DESC);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_products_select_public_active" ON public.store_products;
CREATE POLICY "store_products_select_public_active"
ON public.store_products
FOR SELECT
TO anon, authenticated
USING (activo = true);

DROP POLICY IF EXISTS "store_products_select_admin_all" ON public.store_products;
CREATE POLICY "store_products_select_admin_all"
ON public.store_products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "store_products_insert_admin" ON public.store_products;
CREATE POLICY "store_products_insert_admin"
ON public.store_products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "store_products_update_admin" ON public.store_products;
CREATE POLICY "store_products_update_admin"
ON public.store_products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "store_products_delete_admin" ON public.store_products;
CREATE POLICY "store_products_delete_admin"
ON public.store_products
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.auth_user_roles roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  )
);

INSERT INTO public.store_products (slug, nombre, descripcion, url_imagen, precio_crc, activo, sort_order)
VALUES
  ('serum-nutritivo-lashary', 'Serum nutritivo Lashary', 'Tratamiento nutritivo para mantenimiento de pestañas.', '/productos/serum-nutritivo.jpg', 18000, true, 1),
  ('cepillo-limpiador-lashary', 'Cepillo limpiador Lashary', 'Accesorio para limpieza suave diaria.', '/productos/cepillo-limpiador.jpg', 12000, true, 2)
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  url_imagen = EXCLUDED.url_imagen,
  precio_crc = EXCLUDED.precio_crc,
  activo = EXCLUDED.activo,
  sort_order = EXCLUDED.sort_order,
  updated_at = timezone('utc', now());
