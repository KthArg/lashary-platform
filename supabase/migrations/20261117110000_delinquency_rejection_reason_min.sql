-- 20261117110000_delinquency_rejection_reason_min.sql
-- US-MOR-03 · feature delinquency — el motivo del rechazo de una regularización lleva al menos 10 caracteres
-- (contrato: docs/contracts/delinquency-api.md, «Estados de una solicitud»).
-- Decisión de la clienta (dueña del estudio), 2026-11-18, comunicada por Jose Lorenzo: como el motivo de la
-- excepción de US-MOR-02 (docs/process/DEPENDENCIES.md). La clienta lee ese motivo en su estado de cuenta, así que
-- tiene que decirle algo. Se cuenta sin los espacios de los extremos; el tope sigue en 500.
-- Solo cambia la validación del motivo: el resto de delinquency_reject_regularization es el de la migración
-- 20261116000006, y CREATE OR REPLACE conserva sus permisos (solo authenticated, sin anon).
-- Cumplimiento: DOM-011, SEC-001, INT-003, INT-008.

CREATE OR REPLACE FUNCTION public.delinquency_reject_regularization(
  p_request_id uuid,
  p_reason     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_min_reason CONSTANT integer := 10;
  c_max_reason CONSTANT integer := 500;

  v_case_id uuid;
  v_request public.delinquency_regularizations;
  v_reason  text;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'delinquency_not_admin' USING ERRCODE = '42501';
  END IF;

  v_reason := btrim(coalesce(p_reason, ''));
  IF length(v_reason) < c_min_reason OR length(v_reason) > c_max_reason THEN
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
