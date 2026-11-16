-- 20261108000003_delinquency_decide_case_fn.sql
-- US-MOR-01 · feature delinquency — la administradora confirma o descarta una morosidad por revisar
-- (criterio 3, DOM-012). Confirmar la deja `active`, la única que cuenta como morosidad; descartar la
-- deja `dismissed` y no se vuelve a generar por la misma cita. Solo se decide una morosidad que sigue
-- `pending_review`: decidirla otra vez es un error, no un cambio silencioso.
-- SECURITY DEFINER porque delinquency_cases no tiene escritura directa para staff; solo admin la llama.
-- Quién y cuándo decidió queda en la fila y el evento queda en la bitácora, en la misma transacción
-- (DOM-011).
-- Cumplimiento: ARCH-006, DOM-011, DOM-012, SEC-001, SEC-002, INT-008.

CREATE FUNCTION public.delinquency_decide_case(p_case_id uuid, p_decision text)
RETURNS public.delinquency_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case  public.delinquency_cases;
  v_state text;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'delinquency_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_decision IS NULL OR p_decision NOT IN ('confirm', 'dismiss') THEN
    RAISE EXCEPTION 'delinquency_invalid_decision' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_case
    FROM public.delinquency_cases
   WHERE id = p_case_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'delinquency_case_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_case.state <> 'pending_review' THEN
    RAISE EXCEPTION 'delinquency_case_already_decided' USING ERRCODE = '55000';
  END IF;

  v_state := CASE p_decision WHEN 'confirm' THEN 'active' ELSE 'dismissed' END;

  UPDATE public.delinquency_cases
     SET state = v_state, decided_at = now(), decided_by = auth.uid()
   WHERE id = p_case_id
  RETURNING * INTO v_case;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    CASE v_state WHEN 'active' THEN 'delinquency.case.confirmed' ELSE 'delinquency.case.dismissed' END,
    'delinquency_case',
    v_case.id,
    jsonb_build_object(
      'clientId',      v_case.client_id,
      'appointmentId', v_case.appointment_id,
      'pending',       v_case.pending
    )
  );

  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_decide_case(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_decide_case(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_decide_case(uuid, text) TO authenticated;
