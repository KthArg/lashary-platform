CREATE FUNCTION public.catalog_delete_package(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.catalog_package_techniques WHERE package_id = p_id;
  DELETE FROM public.catalog_packages WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalog_delete_package: sin permiso para eliminar el paquete %', p_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_delete_package(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_delete_package(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_delete_package(uuid) TO authenticated;
