CREATE TABLE IF NOT EXISTS public.store_cart_items (
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products (id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL
        CONSTRAINT store_cart_items_cantidad_en_rango CHECK (cantidad BETWEEN 1 AND 99),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_cart_items_user_id ON public.store_cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_store_cart_items_product_id ON public.store_cart_items (product_id);

ALTER TABLE public.store_cart_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.store_cart_items FROM anon;

DROP POLICY IF EXISTS "store_cart_items_select_own" ON public.store_cart_items;
CREATE POLICY "store_cart_items_select_own"
ON public.store_cart_items
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "store_cart_items_insert_own" ON public.store_cart_items;
CREATE POLICY "store_cart_items_insert_own"
ON public.store_cart_items
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1
    FROM public.store_products products
    WHERE products.id = store_cart_items.product_id
      AND products.activo
  )
);

DROP POLICY IF EXISTS "store_cart_items_update_own" ON public.store_cart_items;
CREATE POLICY "store_cart_items_update_own"
ON public.store_cart_items
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1
    FROM public.store_products products
    WHERE products.id = store_cart_items.product_id
      AND products.activo
  )
);

DROP POLICY IF EXISTS "store_cart_items_delete_own" ON public.store_cart_items;
CREATE POLICY "store_cart_items_delete_own"
ON public.store_cart_items
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);
