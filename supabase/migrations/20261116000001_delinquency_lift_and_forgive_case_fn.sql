-- 20261116000001_delinquency_lift_and_forgive_case_fn.sql
-- US-MOR-05 · feature delinquency — levantar el bloqueo sin pago (criterio 1) y condonar total o
-- parcialmente (criterio 2) una morosidad `active` (contrato: docs/contracts/delinquency-api.md).
-- Las dos son decisiones administrativas: reusan decided_at/decided_by, igual que confirmar o
-- descartar (US-MOR-01). `exception_reason` y `exception_amount` quedan aparte porque no aplican a
-- decidir una pending_review y porque el monto condonado es distinto del `pending` original, que
-- nunca se toca (criterio 4: la morosidad original sigue visible con su saldo de siempre).
-- `delinquency_forgive_case` cruza a `payments` (ARCH-005, INT-003) llamando a
-- payments_record_forgiveness_entry, en la misma transacción que el cambio de estado y el evento de
-- bitácora (DOM-005, DOM-011). SECURITY DEFINER porque delinquency_cases no tiene escritura directa
-- para staff, igual que delinquency_decide_case.
-- Cumplimiento: ARCH-005, DOM-005, DOM-011, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

ALTER TABLE public.delinquency_cases
  DROP CONSTRAINT delinquency_cases_decision_matches_state;

ALTER TABLE public.delinquency_cases
  DROP CONSTRAINT delinquency_cases_state_check;

ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_state_check
    CHECK (state IN ('pending_review', 'active', 'dismissed', 'lifted', 'forgiven'));

ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_decision_matches_state CHECK (
    (state = 'pending_review' AND decided_at IS NULL AND decided_by IS NULL)
    OR (state IN ('active', 'dismissed', 'lifted', 'forgiven') AND decided_at IS NOT NULL AND decided_by IS NOT NULL)
  );

ALTER TABLE public.delinquency_cases
  ADD COLUMN exception_reason text,
  ADD COLUMN exception_amount bigint;

ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_exception_reason_matches_state CHECK (
    (state IN ('lifted', 'forgiven') AND exception_reason IS NOT NULL AND char_length(btrim(exception_reason)) > 0
       AND char_length(exception_reason) <= 500)
    OR (state NOT IN ('lifted', 'forgiven') AND exception_reason IS NULL)
  );

ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_exception_amount_matches_state CHECK (
    (state = 'forgiven' AND exception_amount IS NOT NULL AND exception_amount > 0 AND exception_amount <= pending)
    OR (state <> 'forgiven' AND exception_amount IS NULL)
  );

-- Levanta el bloqueo de una morosidad `active` sin tocar el ledger (criterio 1). Solo admin.
CREATE FUNCTION public.delinquency_lift_case(p_case_id uuid, p_reason text)
RETURNS public.delinquency_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case public.delinquency_cases;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'delinquency_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR char_length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'delinquency_invalid_reason' USING ERRCODE = '22004';
  END IF;
  IF char_length(p_reason) > 500 THEN
    RAISE EXCEPTION 'delinquency_invalid_reason' USING ERRCODE = '22004';
  END IF;

  SELECT * INTO v_case FROM public.delinquency_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'delinquency_case_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_case.state <> 'active' THEN
    RAISE EXCEPTION 'delinquency_case_not_active' USING ERRCODE = '55001';
  END IF;

  UPDATE public.delinquency_cases
     SET state = 'lifted', decided_at = now(), decided_by = auth.uid(), exception_reason = p_reason
   WHERE id = p_case_id
  RETURNING * INTO v_case;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(), 'delinquency.case.lifted', 'delinquency_case', v_case.id,
    jsonb_build_object(
      'clientId',      v_case.client_id,
      'appointmentId', v_case.appointment_id,
      'pending',       v_case.pending,
      'reason',        p_reason
    )
  );

  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_lift_case(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_lift_case(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_lift_case(uuid, text) TO authenticated;

-- Condona total o parcialmente una morosidad `active` (criterio 2); cierra el caso siempre, aunque el
-- monto sea parcial (el índice único del ledger solo permite un asiento forgiveness_credit por cita:
-- no hay una segunda condonación más adelante sobre la misma morosidad). Solo admin.
CREATE FUNCTION public.delinquency_forgive_case(p_case_id uuid, p_amount bigint, p_reason text)
RETURNS public.delinquency_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case public.delinquency_cases;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'delinquency_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR char_length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'delinquency_invalid_reason' USING ERRCODE = '22004';
  END IF;
  IF char_length(p_reason) > 500 THEN
    RAISE EXCEPTION 'delinquency_invalid_reason' USING ERRCODE = '22004';
  END IF;

  SELECT * INTO v_case FROM public.delinquency_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'delinquency_case_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_case.state <> 'active' THEN
    RAISE EXCEPTION 'delinquency_case_not_active' USING ERRCODE = '55001';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_case.pending THEN
    RAISE EXCEPTION 'delinquency_invalid_forgive_amount' USING ERRCODE = '22023';
  END IF;

  PERFORM public.payments_record_forgiveness_entry(v_case.client_id, v_case.appointment_id, p_amount);

  UPDATE public.delinquency_cases
     SET state = 'forgiven', decided_at = now(), decided_by = auth.uid(),
         exception_reason = p_reason, exception_amount = p_amount
   WHERE id = p_case_id
  RETURNING * INTO v_case;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(), 'delinquency.case.forgiven', 'delinquency_case', v_case.id,
    jsonb_build_object(
      'clientId',      v_case.client_id,
      'appointmentId', v_case.appointment_id,
      'pending',       v_case.pending,
      'amount',        p_amount,
      'reason',        p_reason
    )
  );

  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_forgive_case(uuid, bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_forgive_case(uuid, bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_forgive_case(uuid, bigint, text) TO authenticated;

-- Listado por caso de las morosidades `active` (delinquency_list_active agrega por clienta; esta
-- función da el detalle que necesitan los botones de levantar/condonar). Mismo patrón de cursor que
-- delinquency_list_active: por el par (since, case_id).
CREATE FUNCTION public.delinquency_list_active_cases(
  p_limit           integer,
  p_after_since     timestamptz DEFAULT NULL,
  p_after_case_id   uuid DEFAULT NULL
)
RETURNS TABLE (case_id uuid, client_id uuid, appointment_id uuid, pending bigint, since timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.client_id, c.appointment_id, c.pending, c.detected_at
    FROM public.delinquency_cases c
   WHERE c.state = 'active'
     AND (
       p_after_since IS NULL
       OR c.detected_at < p_after_since
       OR (c.detected_at = p_after_since AND c.id > coalesce(p_after_case_id, '00000000-0000-0000-0000-000000000000'::uuid))
     )
   ORDER BY c.detected_at DESC, c.id
   LIMIT greatest(1, least(coalesce(p_limit, 100), 100));
$$;

REVOKE ALL ON FUNCTION public.delinquency_list_active_cases(integer, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_list_active_cases(integer, timestamptz, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_list_active_cases(integer, timestamptz, uuid) TO authenticated;
