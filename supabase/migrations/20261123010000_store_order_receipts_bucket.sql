-- 20261123010000_store_order_receipts_bucket.sql
-- US-SHOP-02 · feature store — bucket privado del comprobante de pago del checkout (criterio 2 del
-- backlog; mismo patrón de delinquency-receipts, pieza propia por ADR-0007, sin compartir código
-- entre features, ARCH-002/004).
-- - Privado: un comprobante nunca tiene URL pública; la clienta dueña y el personal lo ven por URL
--   firmada.
-- - Imagen (JPEG, PNG, WebP) o PDF, hasta 1 MB: mismo tope que delinquency-receipts, porque el único
--   método de pago es el mismo SINPE Móvil del estudio (decisión de Erick Duran, 2026-11-23,
--   docs/process/DEPENDENCIES.md) y un comprobante de SINPE o del banco no pesa más (Kenny, 2026-11-18,
--   sobre delinquency-receipts). El tipo real lo decide la aplicación por los primeros bytes (DOM-008);
--   el bucket repite el tope y la lista como segunda barrera.
-- - Cada clienta escribe y lee solo en su carpeta (<client_id>/..., por clients_current_profile_id,
--   ARCH-005). El personal lee todas. Nadie cambia ni borra un comprobante: sin políticas de UPDATE
--   ni DELETE.
-- Cumplimiento: ARCH-005, DOM-008, SEC-001, SEC-002, INT-008.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-order-receipts',
  'store-order-receipts',
  false,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

CREATE POLICY "store_order_receipts_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-order-receipts'
  AND (storage.foldername(name))[1] = public.clients_current_profile_id()::text
);

CREATE POLICY "store_order_receipts_select_own_or_staff"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'store-order-receipts'
  AND (
    (storage.foldername(name))[1] = public.clients_current_profile_id()::text
    OR public.auth_is_staff()
  )
);
