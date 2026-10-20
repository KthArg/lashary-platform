ALTER TABLE public.catalog_packages
 ADD COLUMN deposit bigint NOT NULL DEFAULT 0
 CONSTRAINT catalog_packages_deposit_nonnegative CHECK (deposit >= 0);

CREATE FUNCTION public.catalog_save_package_with_deposit(
 p_id uuid, p_name text, p_price bigint, p_is_active boolean,
 p_technique_ids uuid[], p_deposit bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
 IF p_deposit IS NULL OR p_deposit < 0 THEN
  RAISE EXCEPTION 'el anticipo debe ser un entero de colones no negativo'
   USING ERRCODE = '23514';
 END IF;

 PERFORM public.catalog_save_package(p_id, p_name, p_price, p_is_active, p_technique_ids);
 UPDATE public.catalog_packages SET deposit = p_deposit WHERE id = p_id;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'sin permiso para modificar el anticipo del paquete'
   USING ERRCODE = '42501';
 END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_save_package_with_deposit(uuid,text,bigint,boolean,uuid[],bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_save_package_with_deposit(uuid,text,bigint,boolean,uuid[],bigint) TO authenticated;
