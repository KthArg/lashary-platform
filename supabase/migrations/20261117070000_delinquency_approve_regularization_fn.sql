-- 20261117070000_delinquency_approve_regularization_fn.sql
-- US-MOR-03 · feature delinquency — la administradora aprueba una regularización (criterio 3; contrato:
-- docs/contracts/delinquency-api.md, «Lo que delinquency pide a payments»).
-- delinquency_approve_regularization(solicitud, monto aprobado) => el estado en que queda la morosidad
-- - Solo administradora (`delinquency_not_admin`, 42501, como decidir una morosidad).
-- - La solicitud tiene que estar pendiente y su morosidad `active`: si no existe, `delinquency_regularization_not_found`
--   (P0002); si ya se revisó o se reemplazó, `delinquency_regularization_not_pending` (55000).
-- - El monto aprobado lo decide la administradora tras verificar el comprobante, y puede ser distinto del
--   declarado (Kenny, 2026-11-13): de 1 hasta el saldo de hoy de la cita (`delinquency_approved_amount_invalid`,
--   22023). payments_record_payment repite el tope, con un lock por cita.
-- - En una sola transacción (DOM-011): asienta el pago en el ledger por payments_record_payment (ARCH-005),
--   marca la solicitud aprobada con el monto, el asiento y quién la revisó, y si la cita queda en cero la
--   morosidad pasa a `settled`. Con eso el bloqueo de la agenda se levanta solo (US-MOR-02: mira el saldo).
--   Un pago parcial deja la morosidad `active` y la clienta puede enviar otra solicitud.
-- - Deja `delinquency.regularization.approved` en la bitácora con lo declarado y lo aprobado, el saldo antes
--   y después, y el asiento.
-- SECURITY DEFINER: la administradora no tiene EXECUTE sobre payments_record_payment ni escribe estas
-- tablas; la función corre con los permisos del dueño. anon no tiene EXECUTE.
-- Cumplimiento: ARCH-005, DOM-005, DOM-011, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

CREATE FUNCTION public.delinquency_approve_regularization(
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
  SELECT * INTO v_case FROM public.delinquency_cases c WHERE c.id = v_case_id;
  IF v_request.state <> 'pending_approval' OR v_case.state <> 'active' THEN
    RAISE EXCEPTION 'delinquency_regularization_not_pending' USING ERRCODE = '55000';
  END IF;

  SELECT coalesce(max(b.pending), 0) INTO v_pending
    FROM public.payments_appointment_balances(ARRAY[v_case.appointment_id]) b;
  IF p_approved_amount IS NULL OR p_approved_amount <= 0 OR p_approved_amount > v_pending THEN
    RAISE EXCEPTION 'delinquency_approved_amount_invalid' USING ERRCODE = '22023';
  END IF;

  v_entry_id := public.payments_record_payment(v_case.client_id, v_case.appointment_id, p_approved_amount);

  UPDATE public.delinquency_regularizations r
     SET state            = 'approved',
         approved_amount  = p_approved_amount,
         payment_entry_id = v_entry_id,
         reviewed_by      = auth.uid(),
         reviewed_at      = now()
   WHERE r.id = p_request_id;

  IF v_pending - p_approved_amount = 0 THEN
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
      'pendingAfter',   v_pending - p_approved_amount,
      'caseState',      v_new_state,
      'paymentEntryId', v_entry_id
    )
  );

  RETURN v_new_state;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_approve_regularization(uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_approve_regularization(uuid, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_approve_regularization(uuid, bigint) TO authenticated;
