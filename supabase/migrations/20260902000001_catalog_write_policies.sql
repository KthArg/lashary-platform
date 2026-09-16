-- 20260902000001_catalog_write_policies.sql
-- US-AGE-08 · feature catalog — habilita la escritura del catálogo para staff.
--
-- Depende de la feature auth (US-AUTH-01): asume que ya existen `public.auth_user_roles`
-- y el enum `public.app_role`. Esta rama rebasa sobre auth antes de mergear (INT-005).
-- Cumplimiento: SEC-001 (RLS es la frontera real), SEC-002 (test de aislamiento), INT-008.

-- auth_is_staff() — contrato entre auth y las features que restringen escritura a la
-- administradora (docs/contracts/catalog-api.md). Vive acá de forma provisional; cuando auth
-- la exponga en su propia migración, esta definición se retira en una migración forward.
CREATE OR REPLACE FUNCTION public.auth_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.auth_user_roles AS roles
    WHERE roles.user_id = auth.uid()
      AND roles.role IN ('admin', 'superadmin')
  );
$$;

REVOKE ALL ON FUNCTION public.auth_is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_is_staff() TO authenticated;

-- Políticas de escritura de catalog_techniques: solo staff. La lectura pública ya la da
-- catalog_techniques_select_all (migración 20260902000000).
CREATE POLICY "catalog_techniques_insert_staff"
  ON public.catalog_techniques
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "catalog_techniques_update_staff"
  ON public.catalog_techniques
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_staff())
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "catalog_techniques_delete_staff"
  ON public.catalog_techniques
  FOR DELETE
  TO authenticated
  USING (public.auth_is_staff());
