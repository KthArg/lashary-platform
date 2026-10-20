-- 20261019000002_scheduling_quote_booking_fn.sql
-- US-AGE-05 · feature scheduling — la cotización que la clienta ve antes de confirmar.
-- Criterio 7: el monto del anticipo se muestra antes de confirmar la cita. Lo que se muestra tiene
-- que ser lo mismo que después guarda scheduling_book_appointment, así que sale de las mismas
-- fuentes: catalog_booking_terms para el precio y la duración y payments_deposit_due para el
-- anticipo con la exoneración aplicada, con la clienta sacada de la sesión (SEC-005). No escribe
-- nada y no recibe ningún dato de la clienta salvo qué técnica y si es primera vez.
-- Errores: RAISE con un código en el mensaje, los mismos de la reserva.
--   scheduling_client_not_registered   la sesión no es de una clienta con perfil
--   scheduling_technique_not_available técnica inexistente, desactivada o sin retoque
-- Cumplimiento: ARCH-005, DOM-002, SEC-001, SEC-005, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_quote_booking(p_technique_id uuid, p_is_first_time boolean)
RETURNS TABLE (
  technique_name text,
  price          bigint,
  duration_min   integer,
  buffer_min     integer,
  deposit_due    bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
  v_terms     record;
BEGIN
  SELECT c.id INTO v_client_id
    FROM public.clients_profiles c
   WHERE c.user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT * INTO v_terms FROM public.catalog_booking_terms(p_technique_id, p_is_first_time);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_technique_not_available';
  END IF;

  RETURN QUERY
    SELECT v_terms.name, v_terms.price, v_terms.duration_min, v_terms.buffer_min,
           public.payments_deposit_due(v_client_id, v_terms.deposit);
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_quote_booking(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_quote_booking(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_quote_booking(uuid, boolean) TO authenticated;
