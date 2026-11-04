-- 20261031000000_payments_ledger_entries.sql
-- US-AGE-12 · feature payments — ledger append-only (DOM-005). Infraestructura sin historia propia
-- (ADR-0007): la porta esta historia y la reutilizan US-MOR-01 a 05, US-PROM y el cierre de mes.
-- El saldo de una clienta NO es una columna: se calcula sumando asientos (cargos positivos, créditos
-- y pagos negativos). Una corrección es un contra-asiento nuevo, nunca un UPDATE ni un DELETE.
-- Un asiento solo es un registro: el sistema no toca una pasarela ni mueve dinero.
-- scheduling no escribe esta tabla: llama a `payments_record_close_entries` (ARCH-005, INT-003).
-- `appointment_id` no tiene FK a propósito: la cita es de otra feature (ARCH-005) y los asientos que
-- vengan con US-MOR-03 pueden no tener cita.
-- Sin políticas de UPDATE ni DELETE y con el privilegio revocado: la base los deniega a staff.
-- Cumplimiento: ARCH-005, ARCH-006, DOM-002, DOM-003, DOM-005, SEC-001, SEC-002, PERF-003, INT-008.

CREATE TABLE public.payments_ledger_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid NOT NULL REFERENCES public.clients_profiles(id) ON DELETE RESTRICT,
  appointment_id uuid,
  kind           text NOT NULL CHECK (kind IN ('charge', 'deposit_credit')),
  amount         bigint NOT NULL,
  created_by     uuid NOT NULL REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_ledger_entries_amount_sign CHECK (
    (kind = 'charge' AND amount > 0) OR (kind = 'deposit_credit' AND amount < 0)
  ));

CREATE INDEX idx_payments_ledger_entries_client ON public.payments_ledger_entries (client_id, created_at);
CREATE INDEX idx_payments_ledger_entries_created_by ON public.payments_ledger_entries (created_by);

-- Una cita no puede cobrarse ni acreditarse dos veces: cerrar dos veces no duplica asientos.
CREATE UNIQUE INDEX idx_payments_ledger_entries_appointment_kind
  ON public.payments_ledger_entries (appointment_id, kind);

ALTER TABLE public.payments_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_ledger_entries_select_staff"
  ON public.payments_ledger_entries
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "payments_ledger_entries_insert_staff"
  ON public.payments_ledger_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

-- Quién registra el asiento lo fija la base desde la sesión, no el que llama.
CREATE FUNCTION public.payments_stamp_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_ledger_entries_stamp
  BEFORE INSERT ON public.payments_ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.payments_stamp_ledger_entry();

REVOKE UPDATE, DELETE, TRUNCATE ON public.payments_ledger_entries FROM anon, authenticated;
REVOKE INSERT ON public.payments_ledger_entries FROM authenticated;
GRANT INSERT (client_id, appointment_id, kind, amount) ON public.payments_ledger_entries TO authenticated;

-- Cierre de una cita: el cargo (precio congelado, DOM-002) y, si hay anticipo registrado, su crédito.
-- Devuelve lo que queda por pagar de esa cita (cargo menos anticipo; negativo si el anticipo lo supera).
CREATE FUNCTION public.payments_record_close_entries(
  p_client_id      uuid,
  p_appointment_id uuid,
  p_charge         bigint,
  p_deposit_credit bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_charge IS NULL OR p_charge <= 0 THEN
    RAISE EXCEPTION 'payments_charge_invalid';
  END IF;
  IF p_deposit_credit IS NULL OR p_deposit_credit < 0 THEN
    RAISE EXCEPTION 'payments_deposit_credit_invalid';
  END IF;

  INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
  VALUES (p_client_id, p_appointment_id, 'charge', p_charge);

  IF p_deposit_credit > 0 THEN
    INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
    VALUES (p_client_id, p_appointment_id, 'deposit_credit', -p_deposit_credit);
  END IF;

  RETURN p_charge - p_deposit_credit;
END;
$$;

REVOKE ALL ON FUNCTION public.payments_record_close_entries(uuid, uuid, bigint, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.payments_record_close_entries(uuid, uuid, bigint, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.payments_record_close_entries(uuid, uuid, bigint, bigint) TO authenticated;

-- Saldo de una clienta: la suma de sus asientos. Corre con los permisos de quien llama, así que RLS
-- lo limita a staff: una clienta o anon no ven ningún asiento y reciben 0.
CREATE FUNCTION public.payments_client_balance(p_client_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(sum(e.amount), 0)::bigint
    FROM public.payments_ledger_entries e
   WHERE e.client_id = p_client_id;
$$;

REVOKE ALL ON FUNCTION public.payments_client_balance(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.payments_client_balance(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.payments_client_balance(uuid) TO authenticated;
