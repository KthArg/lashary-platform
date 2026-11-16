CREATE FUNCTION public.catalog_service_aftercare(p_technique_id uuid, p_package_id uuid)
RETURNS TABLE (
  technique_name text,
  aftercare_text text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT s.name, s.aftercare_text
    FROM (
      SELECT t.id, t.name, t.aftercare_text
        FROM public.catalog_techniques t
       WHERE p_technique_id IS NOT NULL
         AND p_package_id IS NULL
         AND t.id = p_technique_id
      UNION ALL
      SELECT t.id, t.name, t.aftercare_text
        FROM public.catalog_package_techniques pt
        JOIN public.catalog_techniques t ON t.id = pt.technique_id
       WHERE p_package_id IS NOT NULL
         AND p_technique_id IS NULL
         AND pt.package_id = p_package_id
    ) s
   ORDER BY s.name, s.id;
$$;

REVOKE ALL ON FUNCTION public.catalog_service_aftercare(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_service_aftercare(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_service_aftercare(uuid, uuid) TO authenticated;
