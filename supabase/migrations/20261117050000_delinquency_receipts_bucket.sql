-- 20261117050000_delinquency_receipts_bucket.sql
-- US-MOR-03 · feature delinquency — bucket privado de los comprobantes de pago (contrato:
-- docs/contracts/delinquency-api.md, «El comprobante»).
-- - Privado: un comprobante nunca tiene URL pública; la clienta dueña y el personal lo ven por URL firmada.
-- - Imagen (JPEG, PNG, WebP) o PDF, hasta 4 MB: dentro del rango de 3 a 5 MB de Kenny (2026-11-13), porque el
--   archivo pasa por el servidor y Vercel acepta como mucho 4,5 MB por petición. Se revisa con el peso promedio.
--   El tipo real lo decide la aplicación en el servidor por los primeros bytes (DOM-008); el bucket repite
--   el tope y la lista como segunda barrera, porque una clienta con sesión puede subir directo a Storage.
-- - Cada clienta escribe y lee solo en su carpeta, la de su perfil (`<client_id>/...`, por
--   clients_current_profile_id, ARCH-005). El personal lee todas. Nadie cambia ni borra un comprobante:
--   sin políticas de UPDATE ni DELETE; reemplazar es subir uno nuevo con una solicitud nueva.
-- Cumplimiento: ARCH-005, DOM-008, SEC-001, SEC-002, INT-008.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delinquency-receipts',
  'delinquency-receipts',
  false,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

CREATE POLICY "delinquency_receipts_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delinquency-receipts'
  AND (storage.foldername(name))[1] = public.clients_current_profile_id()::text
);

CREATE POLICY "delinquency_receipts_select_own_or_staff"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'delinquency-receipts'
  AND (
    (storage.foldername(name))[1] = public.clients_current_profile_id()::text
    OR public.auth_is_staff()
  )
);
