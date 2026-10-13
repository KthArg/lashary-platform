-- 20260922000001_catalog_package_write_policies.sql
-- US-PROD-01 · feature catalog — escritura de paquetes solo para staff.
-- Reusa public.auth_is_staff() de 20260902000001_catalog_write_policies.sql (provisional en
-- catalog hasta que auth la exponga).
-- Cumplimiento: SEC-001 (RLS es la frontera real), INT-008 (una migración, forward-only).

CREATE POLICY "catalog_packages_insert_staff"
  ON public.catalog_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "catalog_packages_update_staff"
  ON public.catalog_packages
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_staff())
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "catalog_packages_delete_staff"
  ON public.catalog_packages
  FOR DELETE
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "catalog_package_techniques_insert_staff"
  ON public.catalog_package_techniques
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "catalog_package_techniques_update_staff"
  ON public.catalog_package_techniques
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_staff())
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "catalog_package_techniques_delete_staff"
  ON public.catalog_package_techniques
  FOR DELETE
  TO authenticated
  USING (public.auth_is_staff());
