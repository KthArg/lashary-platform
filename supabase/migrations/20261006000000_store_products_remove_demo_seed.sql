-- Corrige datos quemados: los productos de ejemplo se insertaron en la migración de esquema
-- (20260912000000_store_products.sql) en vez de en supabase/seed.sql (solo desarrollo, INT-008),
-- así que corrían también en producción. Esta migración es forward-only: no edita la anterior,
-- borra las filas que insertó por error. supabase/seed.sql trae los mismos datos para desarrollo.
DELETE FROM public.store_products
WHERE slug IN ('serum-nutritivo-lashary', 'cepillo-limpiador-lashary');
