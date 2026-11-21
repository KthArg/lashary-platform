-- 20261117030000_payments_record_payment_fn.sql
-- US-MOR-03 · feature payments — registrar un pago en el ledger (contrato: docs/contracts/payments-api.md,
-- «Registro de pago»). Escribe un asiento nuevo `payment` por -p_amount y devuelve su id (DOM-005).
-- - El monto va de 1 hasta el saldo actual de la cita: un pago nunca deja la cita con saldo a favor y una
--   cita sin saldo no admite pagos. Los pagos pequeños están permitidos (Kenny, 2026-11-13).
-- - La cita tiene que ser de esa clienta: tiene asientos suyos y de nadie más.
-- - Toma un lock por cita antes de leer el saldo, así dos aprobaciones simultáneas de la misma cita no pasan
--   juntas el tope.
-- - Nadie con sesión la ejecuta: sin EXECUTE para anon ni authenticated. Es SECURITY INVOKER, como
--   payments_record_close_entries, y la llama solo la aprobación de delinquency (SECURITY DEFINER, exige
--   administradora y deja la bitácora en la misma transacción), con cuyos permisos corre. created_by lo fija
--   el trigger desde la sesión.
-- Cumplimiento: ARCH-005, DOM-005, DOM-011, SEC-001, SEC-002, INT-003, INT-008.

CREATE FUNCTION public.payments_record_payment(
  p_client_id      uuid,
  p_appointment_id uuid,
  p_amount         bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pending bigint;
  v_id      uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'payments_payment_amount_invalid' USING ERRCODE = '22023';
  END IF;

  IF p_client_id IS NULL OR p_appointment_id IS NULL THEN
    RAISE EXCEPTION 'payments_payment_wrong_client' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('payments_appointment:' || p_appointment_id::text, 0));

  IF NOT EXISTS (
       SELECT 1 FROM public.payments_ledger_entries e
        WHERE e.appointment_id = p_appointment_id AND e.client_id = p_client_id
     )
     OR EXISTS (
       SELECT 1 FROM public.payments_ledger_entries e
        WHERE e.appointment_id = p_appointment_id AND e.client_id <> p_client_id
     )
  THEN
    RAISE EXCEPTION 'payments_payment_wrong_client' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(sum(e.amount), 0)::bigint INTO v_pending
    FROM public.payments_ledger_entries e
   WHERE e.appointment_id = p_appointment_id;

  IF p_amount > v_pending THEN
    RAISE EXCEPTION 'payments_payment_exceeds_balance' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
  VALUES (p_client_id, p_appointment_id, 'payment', -p_amount)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.payments_record_payment(uuid, uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.payments_record_payment(uuid, uuid, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.payments_record_payment(uuid, uuid, bigint) FROM authenticated;
