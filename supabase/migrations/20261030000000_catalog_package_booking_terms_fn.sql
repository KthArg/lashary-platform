-- 20261030000000_catalog_package_booking_terms_fn.sql
-- US-AGE-04 · feature catalog — contrato SQL para reservar un paquete: sus condiciones y las de
-- cada técnica incluida. Mismo motivo que catalog_booking_terms (20261018000003): la clienta va a
-- llamar la función de reserva de paquete directo por PostgREST, así que precio, anticipo y
-- duración no pueden venir de parámetros suyos; los calcula la base, no la aplicación (ARCH-005,
-- DOM-002, INT-003). scheduling nunca lee catalog_packages ni catalog_package_techniques.
-- Devuelve una fila por técnica incluida (los campos del paquete se repiten en cada una), para que
-- quien reserve pueda congelar tanto el paquete como el detalle de sus técnicas (criterio 2: el
-- tiempo total suma duración + limpieza de cada servicio incluido). Ninguna fila si el paquete no
-- existe, está desactivado o no tiene técnicas — igual trato que una técnica desactivada en
-- catalog_booking_terms. Siempre usa duration_first_time_min: un paquete no tiene concepto de
-- retoque (igual que durationTotalMin en db/packages/package-repository.ts), y no filtra técnicas
-- inactivas dentro del paquete, igual que esa misma lectura.
-- Cumplimiento: ARCH-005, DOM-002, SEC-001, INT-003, INT-008 (una migración, forward-only).

CREATE FUNCTION public.catalog_package_booking_terms(p_package_id uuid)
RETURNS TABLE (
  package_id     uuid,
  package_name   text,
  package_price  bigint,
  deposit        bigint,
  technique_id   uuid,
  technique_name text,
  duration_min   integer,
  buffer_min     integer
)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT p.id,
         p.name,
         p.price,
         p.deposit,
         t.id,
         t.name,
         t.duration_first_time_min,
         t.buffer_min
    FROM public.catalog_packages p
    JOIN public.catalog_package_techniques pt ON pt.package_id = p.id
    JOIN public.catalog_techniques t ON t.id = pt.technique_id
   WHERE p.id = p_package_id
     AND p.is_active
   ORDER BY t.id;
$$;

REVOKE ALL ON FUNCTION public.catalog_package_booking_terms(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_package_booking_terms(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_package_booking_terms(uuid) TO authenticated;
