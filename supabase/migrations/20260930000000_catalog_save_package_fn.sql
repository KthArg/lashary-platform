-- 20260930000000_catalog_save_package_fn.sql
-- US-PROD-01 · feature catalog — guardado atómico de un paquete.
-- Antes, db/package-repository.ts guardaba en tres llamadas separadas (upsert del paquete,
-- borrado de sus filas puente, inserción de las nuevas). Si la inserción fallaba, el paquete
-- quedaba con menos de dos técnicas y el listado completo caía al reconstituirlo (DOM-007).
-- Una función se ejecuta en una sola transacción: o se guarda todo, o nada.
-- Cumplimiento: SEC-001 (SECURITY INVOKER — RLS y las políticas *_staff siguen aplicando),
--   INT-008 (una migración, forward-only).

CREATE FUNCTION public.catalog_save_package(
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
  INSERT INTO public.catalog_packages (id, name, price, is_active)
  VALUES (p_id, p_name, p_price, p_is_active)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        price = EXCLUDED.price,
        is_active = EXCLUDED.is_active;

  -- Sin fila actualizada = RLS la ocultó (no es staff): se aborta en vez de seguir con el puente.
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

REVOKE ALL ON FUNCTION public.catalog_save_package(uuid, text, bigint, boolean, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_save_package(uuid, text, bigint, boolean, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_save_package(uuid, text, bigint, boolean, uuid[]) TO authenticated;
