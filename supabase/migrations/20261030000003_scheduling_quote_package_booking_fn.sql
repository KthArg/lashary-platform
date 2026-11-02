-- 20261030000003_scheduling_quote_package_booking_fn.sql
-- US-AGE-04 · feature scheduling — cotización de un paquete antes de confirmar la reserva, igual
-- que scheduling_quote_booking (US-AGE-05) para una técnica suelta. La pantalla de confirmación
-- (criterio 3: el precio mostrado corresponde al precio del paquete) llama a esta función con el
-- mismo contrato de sesión que scheduling_book_package_appointment, para no mostrar un precio que
-- la reserva real no vaya a congelar.
-- Cumplimiento: ARCH-005, DOM-001, DOM-002, SEC-001, SEC-005, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_quote_package_booking(p_package_id uuid)
RETURNS TABLE (
  package_name text,
  price        bigint,
  duration_min integer,
  buffer_min   integer,
  deposit_due  bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id       uuid;
  v_technique_count bigint;
  v_package_name    text;
  v_package_price   bigint;
  v_deposit         bigint;
  v_duration_min    bigint;
  v_buffer_min      bigint;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  -- Alias t obligatorio: sin él, package_name es ambiguo entre la columna de la función y el
  -- parámetro de salida homónimo de este RETURNS TABLE (a diferencia de
  -- scheduling_book_package_appointment, que no declara TABLE y no tiene ese choque).
  SELECT count(*), max(t.package_name), max(t.package_price), max(t.deposit),
         sum(t.duration_min), sum(t.buffer_min)
    INTO v_technique_count, v_package_name, v_package_price, v_deposit,
         v_duration_min, v_buffer_min
    FROM public.catalog_package_booking_terms(p_package_id) AS t;

  IF v_technique_count = 0 THEN
    RAISE EXCEPTION 'scheduling_package_not_available';
  END IF;

  RETURN QUERY
    SELECT v_package_name, v_package_price, v_duration_min::integer, v_buffer_min::integer,
           public.payments_deposit_due(v_client_id, v_deposit);
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_quote_package_booking(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_quote_package_booking(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_quote_package_booking(uuid) TO authenticated;
