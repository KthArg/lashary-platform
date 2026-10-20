-- 20261018000003_catalog_booking_terms_fn.sql
-- US-AGE-05 · feature catalog — contrato SQL para reservar: las condiciones de una técnica.
-- La reserva de la clienta la calcula la base, no la aplicación: una clienta puede llamar la
-- función de reserva directo por PostgREST, así que precio, anticipo y duración no pueden venir de
-- parámetros suyos. scheduling no lee catalog_techniques: llama a esta función, que es el
-- contrato de catalog (ARCH-005, INT-003). Devuelve una fila con las condiciones aplicables, o
-- ninguna si la técnica no existe, está desactivada o no ofrece retoque.
-- Cumplimiento: ARCH-005, DOM-002, SEC-001, INT-008 (una migración, forward-only).

CREATE FUNCTION public.catalog_booking_terms(p_technique_id uuid, p_is_first_time boolean)
RETURNS TABLE (
  technique_id uuid,
  name         text,
  price        bigint,
  duration_min integer,
  buffer_min   integer,
  deposit      bigint
)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT t.id,
         t.name,
         CASE WHEN p_is_first_time THEN t.price_first_time ELSE t.price_retouch END,
         CASE WHEN p_is_first_time THEN t.duration_first_time_min ELSE t.duration_retouch_min END,
         t.buffer_min,
         t.deposit
    FROM public.catalog_techniques t
   WHERE t.id = p_technique_id
     AND t.is_active
     AND (p_is_first_time OR t.price_retouch IS NOT NULL);
$$;

REVOKE ALL ON FUNCTION public.catalog_booking_terms(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_booking_terms(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_booking_terms(uuid, boolean) TO authenticated;
