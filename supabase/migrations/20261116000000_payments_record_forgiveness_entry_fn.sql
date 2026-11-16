-- 20261116000000_payments_record_forgiveness_entry_fn.sql
-- US-MOR-05 · feature payments — nuevo asiento forgiveness_credit y la función que lo escribe
-- (contrato: docs/contracts/payments-api.md, ARCH-005, INT-003). Mismo patrón que
-- payments_record_close_entries (SECURITY INVOKER, EXECUTE revocado de authenticated y anon): solo una
-- función SECURITY DEFINER de quien perdona (delinquency_forgive_case, pieza siguiente) puede llamarla,
-- corriendo con los permisos de su dueña, igual que scheduling_close_appointment.
-- Un asiento forgiveness_credit por cita: reusa el índice único (appointment_id, kind) que ya existe,
-- así que condonar dos veces la misma cita es un error, no un segundo descuento.
-- Cumplimiento: ARCH-005, DOM-005, SEC-001, INT-003, INT-008.

ALTER TABLE public.payments_ledger_entries
  DROP CONSTRAINT payments_ledger_entries_kind_check;

ALTER TABLE public.payments_ledger_entries
  ADD CONSTRAINT payments_ledger_entries_kind_check
    CHECK (kind IN ('charge', 'deposit_credit', 'forgiveness_credit'));

ALTER TABLE public.payments_ledger_entries
  DROP CONSTRAINT payments_ledger_entries_amount_sign;

ALTER TABLE public.payments_ledger_entries
  ADD CONSTRAINT payments_ledger_entries_amount_sign CHECK (
    (kind = 'charge' AND amount > 0)
    OR (kind IN ('deposit_credit', 'forgiveness_credit') AND amount < 0)
  );

-- Perdona p_amount del saldo de la clienta con un asiento negativo. Devuelve el saldo resultante de la
-- clienta (payments_client_balance tras el asiento), mismo patrón que payments_record_close_entries
-- devolviendo lo que queda por pagar.
CREATE FUNCTION public.payments_record_forgiveness_entry(
  p_client_id      uuid,
  p_appointment_id uuid,
  p_amount         bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'payments_forgiveness_amount_invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
  VALUES (p_client_id, p_appointment_id, 'forgiveness_credit', -p_amount);

  RETURN public.payments_client_balance(p_client_id);
END;
$$;

REVOKE ALL ON FUNCTION public.payments_record_forgiveness_entry(uuid, uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.payments_record_forgiveness_entry(uuid, uuid, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.payments_record_forgiveness_entry(uuid, uuid, bigint) FROM authenticated;
