-- 20261120000000_payments_record_forgiveness_entry_fn.sql
-- US-MOR-05 · feature payments — nuevo asiento forgiveness_credit y la función que lo escribe
-- (contrato: docs/contracts/payments-api.md, ARCH-005, INT-003). Mismo patrón que
-- payments_record_close_entries (SECURITY INVOKER, EXECUTE revocado de authenticated y anon): solo una
-- función SECURITY DEFINER de quien perdona (delinquency_forgive_case, pieza siguiente) puede llamarla,
-- corriendo con los permisos de su dueña, igual que scheduling_close_appointment.
--
-- Fecha elegida a propósito (auditoría del 2026-11-18, A1/A2): la pila de US-MOR-03 (#902 a #924) ya
-- reescribe el mismo CHECK de kind/signo con otra lista (agrega 'payment') y acota el índice único
-- (appointment_id, kind) a charge/deposit_credit; su última migración de ledger es 20261116000000 y la
-- pila entera termina en 20261118000001. Esta migración usa 20261120, posterior a toda esa pila y a la
-- de US-AGE-08 (20261116000000, solo choque de prefijo), y reescribe el CHECK como la unión de las dos
-- listas, asumiendo que la de US-MOR-03 ya aplicó por número de versión. No se toca el índice único de
-- US-MOR-03: forgiveness_credit no lo necesita (ver abajo).
--
-- forgiveness_credit NO es único por cita (a diferencia de charge/deposit_credit): condonar parcial deja
-- el caso active (decisión de Kenny, 2026-11-18) y puede condonarse más de una vez hasta saldar, igual
-- que payment ya admite varios pagos por cita.
-- Cumplimiento: ARCH-005, DOM-005, SEC-001, INT-003, INT-008.

ALTER TABLE public.payments_ledger_entries
  DROP CONSTRAINT payments_ledger_entries_kind_check;

ALTER TABLE public.payments_ledger_entries
  ADD CONSTRAINT payments_ledger_entries_kind_check
    CHECK (kind IN ('charge', 'deposit_credit', 'payment', 'forgiveness_credit'));

ALTER TABLE public.payments_ledger_entries
  DROP CONSTRAINT payments_ledger_entries_amount_sign;

ALTER TABLE public.payments_ledger_entries
  ADD CONSTRAINT payments_ledger_entries_amount_sign CHECK (
    (kind = 'charge' AND amount > 0)
    OR (kind IN ('deposit_credit', 'payment', 'forgiveness_credit') AND amount < 0)
  );

-- forgiveness_credit no es único por cita (como payment, de US-MOR-03): el índice único solo protege a
-- charge/deposit_credit. IF EXISTS porque, según el orden real de aplicación, la pila de US-MOR-03 puede
-- haber dejado el índice ya acotado así; si no, esta migración lo acota ella misma.
DROP INDEX IF EXISTS public.idx_payments_ledger_entries_appointment_kind;

CREATE UNIQUE INDEX idx_payments_ledger_entries_appointment_kind
  ON public.payments_ledger_entries (appointment_id, kind)
  WHERE kind IN ('charge', 'deposit_credit');

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
