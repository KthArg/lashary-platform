INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clients-record-images',
  'clients-record-images',
  false,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

CREATE POLICY "clients_record_images_select_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clients-record-images'
    AND (SELECT public.auth_is_admin())
  );

CREATE POLICY "clients_record_images_insert_admin"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clients-record-images'
    AND (SELECT public.auth_is_admin())
    AND EXISTS (
      SELECT 1
      FROM public.clients_profiles profiles
      WHERE profiles.id::text = (storage.foldername(name))[1]
    )
  );
