-- 20261121000000_delinquency_regularization_audit_fixes.sql
-- US-MOR-03 · feature delinquency — correcciones de la auditoría de Kenny del 2026-11-18 que quedaron fuera
-- del cierre de la historia (#943). Una sola migración por pieza (INT-008), con dos cambios:
-- - B4: delinquency_approve_regularization bloquea la fila de la morosidad (FOR UPDATE), igual que levantarla
--   o condonarla en US-MOR-05, para que una aprobación y una excepción de la misma morosidad no se crucen. Y
--   decide si la morosidad queda `settled` con el saldo leído después de asentar el pago, no con el de antes.
--   El resto de la función es el de 20261117070000; CREATE OR REPLACE conserva sus permisos (solo
--   authenticated, sin anon).
-- - B3: el CHECK por estado de delinquency_regularizations exige de 10 a 500 caracteres de motivo en una
--   solicitud rechazada, el mismo mínimo que la función de rechazo desde 20261117110000. La función lo exigió
--   desde que la historia llegó a producción, así que no hay filas que lo incumplan.
-- Cumplimiento: DOM-011, SEC-001, INT-003, INT-008.

CREATE OR REPLACE FUNCTION public.delinquency_approve_regularization(
  p_request_id      uuid,
  p_approved_amount bigint
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case_id   uuid;
  v_request   public.delinquency_regularizations;
  v_case      public.delinquency_cases;
  v_pending   bigint;
  v_after     bigint;
  v_entry_id  uuid;
  v_new_state text;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'delinquency_not_admin' USING ERRCODE = '42501';
  END IF;

  SELECT r.case_id INTO v_case_id FROM public.delinquency_regularizations r WHERE r.id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'delinquency_regularization_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- El mismo lock que el envío: aprobar no se cruza con un reenvío de la misma morosidad.
  PERFORM pg_advisory_xact_lock(hashtextextended('delinquency_case:' || v_case_id::text, 0));

  SELECT * INTO v_request FROM public.delinquency_regularizations r WHERE r.id = p_request_id;
  SELECT * INTO v_case FROM public.delinquency_cases c WHERE c.id = v_case_id FOR UPDATE;
  IF v_request.state <> 'pending_approval' OR v_case.state <> 'active' THEN
    RAISE EXCEPTION 'delinquency_regularization_not_pending' USING ERRCODE = '55000';
  END IF;

  SELECT coalesce(max(b.pending), 0) INTO v_pending
    FROM public.payments_appointment_balances(ARRAY[v_case.appointment_id]) b;
  IF p_approved_amount IS NULL OR p_approved_amount <= 0 OR p_approved_amount > v_pending THEN
    RAISE EXCEPTION 'delinquency_approved_amount_invalid' USING ERRCODE = '22023';
  END IF;

  v_entry_id := public.payments_record_payment(v_case.client_id, v_case.appointment_id, p_approved_amount);

  SELECT coalesce(max(b.pending), 0) INTO v_after
    FROM public.payments_appointment_balances(ARRAY[v_case.appointment_id]) b;

  UPDATE public.delinquency_regularizations r
     SET state            = 'approved',
         approved_amount  = p_approved_amount,
         payment_entry_id = v_entry_id,
         reviewed_by      = auth.uid(),
         reviewed_at      = now()
   WHERE r.id = p_request_id;

  IF v_after = 0 THEN
    UPDATE public.delinquency_cases c
       SET state = 'settled', settled_at = now()
     WHERE c.id = v_case_id;
    v_new_state := 'settled';
  ELSE
    v_new_state := 'active';
  END IF;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'delinquency.regularization.approved',
    'delinquency_regularization',
    p_request_id,
    jsonb_build_object(
      'caseId',         v_case_id,
      'clientId',       v_case.client_id,
      'declaredAmount', v_request.declared_amount,
      'approvedAmount', p_approved_amount,
      'pendingBefore',  v_pending,
      'pendingAfter',   v_after,
      'caseState',      v_new_state,
      'paymentEntryId', v_entry_id
    )
  );

  RETURN v_new_state;
END;
$$;

ALTER TABLE public.delinquency_regularizations
  DROP CONSTRAINT delinquency_regularizations_state_fields;

ALTER TABLE public.delinquency_regularizations
  ADD CONSTRAINT delinquency_regularizations_state_fields CHECK (
    (state IN ('pending_approval', 'replaced')
      AND approved_amount IS NULL AND rejection_reason IS NULL AND payment_entry_id IS NULL
      AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (state = 'approved'
      AND approved_amount > 0 AND payment_entry_id IS NOT NULL AND rejection_reason IS NULL
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    OR (state = 'rejected'
      AND length(btrim(coalesce(rejection_reason, ''))) BETWEEN 10 AND 500
      AND approved_amount IS NULL AND payment_entry_id IS NULL
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  );
