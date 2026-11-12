-- 20261110000000_payments_appointment_balances_fn.sql
-- US-MOR-02 · feature payments — el saldo actual de cada cita pedida, para que `delinquency` sepa si una
-- morosidad confirmada sigue debiendo (contrato: docs/contracts/payments-api.md, ARCH-005, INT-003).
-- Solo lectura: no escribe el ledger (DOM-005). El saldo nunca se guarda: es la suma de los asientos de
-- la cita en el momento de preguntar. Cuando US-MOR-03 registre pagos como asientos, el saldo baja y esta
-- función lo refleja sin cambiar.
-- Corre con los permisos de quien llama (SECURITY INVOKER), como las otras funciones del contrato: la RLS
-- del ledger decide qué se ve, así que solo staff recibe filas; una clienta recibe una lista vacía y anon
-- no tiene EXECUTE. La llama `delinquency_booking_block` (SECURITY DEFINER), que corre con los permisos
-- del dueño y por eso sí ve el ledger en nombre de la clienta sin darle acceso a ella.
-- Cumplimiento: ARCH-005, DOM-005, SEC-001, SEC-002, PERF-002, INT-003, INT-008.

CREATE FUNCTION public.payments_appointment_balances(p_appointment_ids uuid[])
RETURNS TABLE (appointment_id uuid, pending bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(cardinality(p_appointment_ids), 0) > 200 THEN
    RAISE EXCEPTION 'payments_too_many_ids' USING ERRCODE = '54000';
  END IF;

  RETURN QUERY
  SELECT e.appointment_id,
         sum(e.amount)::bigint
    FROM public.payments_ledger_entries e
   WHERE e.appointment_id = ANY (coalesce(p_appointment_ids, ARRAY[]::uuid[]))
   GROUP BY e.appointment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.payments_appointment_balances(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.payments_appointment_balances(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.payments_appointment_balances(uuid[]) TO authenticated;
