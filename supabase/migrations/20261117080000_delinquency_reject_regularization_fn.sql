-- 20261117080000_delinquency_reject_regularization_fn.sql
-- US-MOR-03 · feature delinquency — la administradora rechaza una regularización con un motivo obligatorio
-- (Kenny, 2026-11-13; contrato: docs/contracts/delinquency-api.md, «Estados de una solicitud»).
-- delinquency_reject_regularization(solicitud, motivo)
-- - Solo administradora (`delinquency_not_admin`, 42501).
-- - La solicitud tiene que estar pendiente: si no existe, `delinquency_regularization_not_found` (P0002); si ya
--   se revisó o se reemplazó, `delinquency_regularization_not_pending` (55000).
-- - El motivo no puede estar vacío y tiene hasta 500 caracteres (`delinquency_rejection_reason_required`,
--   22023). Kenny pidió que sea obligatorio pero no fijó un mínimo; si lo fija, se agrega aquí.
-- - No toca el ledger ni la morosidad: sigue `active` y bloqueando, y la clienta puede enviar otra solicitud.
--   Ella ve el motivo en su estado de cuenta.
-- - Deja `delinquency.regularization.rejected` en la bitácora en la misma transacción (DOM-011), con el mismo
--   lock por morosidad que el envío y la aprobación.
-- SECURITY DEFINER: nadie con sesión escribe la tabla de solicitudes. anon no tiene EXECUTE.
-- Cumplimiento: DOM-011, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

CREATE FUNCTION public.delinquency_reject_regularization(
  p_request_id uuid,
  p_reason     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_max_reason CONSTANT integer := 500;

  v_case_id uuid;
  v_request public.delinquency_regularizations;
  v_reason  text;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'delinquency_not_admin' USING ERRCODE = '42501';
  END IF;

  v_reason := btrim(coalesce(p_reason, ''));
  IF length(v_reason) = 0 OR length(v_reason) > c_max_reason THEN
    RAISE EXCEPTION 'delinquency_rejection_reason_required' USING ERRCODE = '22023';
  END IF;

  SELECT r.case_id INTO v_case_id FROM public.delinquency_regularizations r WHERE r.id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'delinquency_regularization_not_found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('delinquency_case:' || v_case_id::text, 0));

  SELECT * INTO v_request FROM public.delinquency_regularizations r WHERE r.id = p_request_id;
  IF v_request.state <> 'pending_approval' THEN
    RAISE EXCEPTION 'delinquency_regularization_not_pending' USING ERRCODE = '55000';
  END IF;

  UPDATE public.delinquency_regularizations r
     SET state            = 'rejected',
         rejection_reason = v_reason,
         reviewed_by      = auth.uid(),
         reviewed_at      = now()
   WHERE r.id = p_request_id;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'delinquency.regularization.rejected',
    'delinquency_regularization',
    p_request_id,
    jsonb_build_object(
      'caseId',         v_case_id,
      'clientId',       v_request.client_id,
      'declaredAmount', v_request.declared_amount,
      'reason',         v_reason
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_reject_regularization(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_reject_regularization(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_reject_regularization(uuid, text) TO authenticated;
