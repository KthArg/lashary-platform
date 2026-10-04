CREATE OR REPLACE FUNCTION public.catalog_save_package(
  p_id            uuid,
  p_name          text,
  p_price         bigint,
  p_is_active     boolean,
  p_technique_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'catalog_save_package: el nombre no puede estar vacío'
      USING ERRCODE = '23514';
  END IF;

  IF coalesce(cardinality(p_technique_ids), 0) < 2 THEN
    RAISE EXCEPTION 'catalog_save_package: un paquete necesita al menos dos técnicas'
      USING ERRCODE = '23514';
  END IF;

  IF (SELECT count(DISTINCT technique_id) FROM unnest(p_technique_ids) AS technique_id)
     <> cardinality(p_technique_ids) THEN
    RAISE EXCEPTION 'catalog_save_package: la lista de técnicas no puede repetir la misma técnica'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.catalog_packages (id, name, price, is_active)
  VALUES (p_id, btrim(p_name), p_price, p_is_active)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        price = EXCLUDED.price,
        is_active = EXCLUDED.is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalog_save_package: sin permiso para escribir el paquete %', p_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.catalog_package_techniques WHERE package_id = p_id;

  INSERT INTO public.catalog_package_techniques (package_id, technique_id)
  SELECT p_id, technique_id
  FROM unnest(p_technique_ids) AS technique_id;
END;
$$;
