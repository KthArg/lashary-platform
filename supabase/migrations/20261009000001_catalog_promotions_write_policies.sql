-- 20261009000001_catalog_promotions_write_policies.sql
-- US-PROM-01 · feature catalog — escritura de promociones solo para staff.
-- Reusa public.auth_is_staff() de 20260902000001_catalog_write_policies.sql.
-- Cumplimiento: SEC-001 (RLS es la frontera real), INT-008 (una migración, forward-only).

CREATE POLICY "catalog_promotions_insert_staff"
  ON public.catalog_promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "catalog_promotions_update_staff"
  ON public.catalog_promotions
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_staff())
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "catalog_promotions_delete_staff"
  ON public.catalog_promotions
  FOR DELETE
  TO authenticated
  USING (public.auth_is_staff());
