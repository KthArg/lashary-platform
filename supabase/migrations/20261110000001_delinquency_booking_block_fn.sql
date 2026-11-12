-- 20261110000001_delinquency_booking_block_fn.sql
-- US-MOR-02 · feature delinquency — ¿está bloqueada esta clienta para agendar? (criterios 1 y 3; contrato:
-- docs/contracts/delinquency-api.md, ARCH-005, INT-003). Devuelve las morosidades que la bloquean, la más
-- antigua primero; sin filas, puede agendar.
-- Una morosidad bloquea si está `active` (solo una confirmada bloquea, DOM-012: `pending_review` y
-- `dismissed` no tienen ninguna consecuencia) Y su cita todavía tiene saldo pendiente en el ledger. El
-- saldo se lee en el momento por `payments_appointment_balances`, no de la foto que guardó la detección:
-- así, cuando el saldo de la cita llega a cero la clienta recupera el acceso sola, sin tocar ninguna tabla
-- (criterio 3). Levantar o perdonar a mano es de US-MOR-05.
-- SECURITY DEFINER porque la clienta llama a las funciones de reserva directo por PostgREST y no puede
-- leer ni delinquency_cases ni el ledger (RLS, SEC-001). Para no abrir esa lectura a cualquiera, responde
-- solo si quien pregunta es la propia clienta o una administradora; a cualquier otra sesión le devuelve
-- vacío, sin error y sin decir si la clienta existe, para que preguntar por otra persona no revele su
-- morosidad. `anon` no tiene EXECUTE.
-- Solo lectura: no escribe nada. El registro del bloqueo lo deja la función de reserva que la consulta.
-- Cumplimiento: ARCH-005, DOM-005, DOM-012, SEC-001, SEC-002, PERF-002, INT-003, INT-008.

CREATE FUNCTION public.delinquency_booking_block(p_client_id uuid)
RETURNS TABLE (appointment_id uuid, pending bigint, since timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_client_id IS NULL
     OR NOT (public.auth_is_admin() OR p_client_id IS NOT DISTINCT FROM public.clients_current_profile_id()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.appointment_id,
         b.pending,
         c.detected_at
    FROM public.delinquency_cases c
    JOIN public.payments_appointment_balances(
           -- Las 200 activas más antiguas: el tope de la función de saldos. Una clienta con más de 200
           -- morosidades confirmadas a la vez no es un caso real; el tope evita que reservar falle.
           ARRAY(
             SELECT a.appointment_id
               FROM public.delinquency_cases a
              WHERE a.client_id = p_client_id
                AND a.state = 'active'
              ORDER BY a.detected_at, a.appointment_id
              LIMIT 200)
         ) b ON b.appointment_id = c.appointment_id
   WHERE c.client_id = p_client_id
     AND c.state = 'active'
     AND b.pending > 0
   ORDER BY c.detected_at, c.appointment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_booking_block(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_booking_block(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_booking_block(uuid) TO authenticated;
