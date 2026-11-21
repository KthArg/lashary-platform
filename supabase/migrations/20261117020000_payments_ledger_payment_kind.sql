-- 20261117020000_payments_ledger_payment_kind.sql
-- US-MOR-03 · feature payments — el ledger admite pagos (contrato: docs/contracts/payments-api.md,
-- «Registro de pago»). Un pago es un asiento nuevo `payment`, con monto negativo, y una cita puede tener
-- varios: los pagos parciales y pequeños están permitidos (decisión del PO, Kenny, 2026-11-13).
-- - El tipo y el signo admiten `payment` (negativo), y un pago siempre es de una cita.
-- - El índice único (appointment_id, kind) se acota a `charge` y `deposit_credit`, los únicos que no se
--   repiten: cerrar dos veces sigue sin duplicar el cargo, y una cita admite varios pagos.
-- - Ese índice era el que servía las sumas por cita (payments_appointment_balances, payments_unpaid_charges);
--   acotado ya no cubre los pagos, así que va un índice simple por cita.
-- Nadie con sesión escribe el ledger (hallazgo M3, 20261102000001): esta migración no cambia permisos. El
-- pago lo escribirá payments_record_payment, en su propia migración.
-- Cumplimiento: DOM-005, SEC-001, SEC-002, PERF-003, INT-008.

ALTER TABLE public.payments_ledger_entries
  DROP CONSTRAINT payments_ledger_entries_kind_check,
  DROP CONSTRAINT payments_ledger_entries_amount_sign;

ALTER TABLE public.payments_ledger_entries
  ADD CONSTRAINT payments_ledger_entries_kind_check
    CHECK (kind IN ('charge', 'deposit_credit', 'payment')),
  ADD CONSTRAINT payments_ledger_entries_amount_sign CHECK (
    (kind = 'charge' AND amount > 0)
    OR (kind IN ('deposit_credit', 'payment') AND amount < 0)
  ),
  ADD CONSTRAINT payments_ledger_entries_payment_has_appointment
    CHECK (kind <> 'payment' OR appointment_id IS NOT NULL);

DROP INDEX public.idx_payments_ledger_entries_appointment_kind;

CREATE UNIQUE INDEX idx_payments_ledger_entries_appointment_kind
  ON public.payments_ledger_entries (appointment_id, kind)
  WHERE kind IN ('charge', 'deposit_credit');

CREATE INDEX idx_payments_ledger_entries_appointment
  ON public.payments_ledger_entries (appointment_id);
