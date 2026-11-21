-- 20261117060000_delinquency_submit_regularization_fn.sql
-- US-MOR-03 · feature delinquency — la clienta envía su regularización y consulta su estado de cuenta
-- (contrato: docs/contracts/delinquency-api.md, «Regularización»). Criterios 1, 2 y 4.
--
-- delinquency_submit_regularization(morosidad, lo declarado, referencia, ruta del comprobante) => uuid
-- - Responde solo por la clienta de la sesión (clients_current_profile_id); otra sesión recibe
--   `delinquency_not_a_client` (42501).
-- - Solo sobre una morosidad `active` propia (Kenny, 2026-11-13): una ajena, inexistente, por revisar,
--   descartada o saldada es la misma respuesta, `delinquency_case_not_regularizable` (P0002), para no revelar
--   si existe. Si su cita ya no debe nada, `delinquency_case_already_paid` (22023).
-- - Lo declarado va de 1 hasta el saldo de hoy de la cita (pagos parciales y pequeños, Kenny 2026-11-13):
--   si no, `delinquency_declared_amount_invalid` (22023). La referencia es opcional, hasta 100 caracteres.
-- - El comprobante tiene que estar ya subido en la carpeta de la clienta en el bucket privado y no estar usado
--   por otra solicitud (`delinquency_receipt_not_found` y `delinquency_receipt_already_used`, 22023). La
--   aplicación validó su contenido antes de subirlo (DOM-008).
-- - Si había una pendiente de esa morosidad, pasa a `replaced` y la nueva la sustituye (lectura provisional
--   de «la clienta puede reemplazar el comprobante», pendiente de que Kenny la confirme).
-- - Deja `delinquency.regularization.submitted` en la bitácora en la misma transacción (DOM-011), con un lock
--   por morosidad para que dos envíos simultáneos no dejen dos pendientes.
--
-- delinquency_my_account() => las morosidades de la clienta de la sesión: las `active` cuya cita todavía
-- debe y las saldadas en los últimos 30 días (para que vea que su regularización se aprobó), cada una con el
-- saldo de hoy y su solicitud más reciente. Sin parámetro de clienta: nadie pregunta por otra.
--
-- Las dos son SECURITY DEFINER porque la clienta no lee las tablas de morosidad ni el ledger; anon no tiene
-- EXECUTE. Cumplimiento: ARCH-005, DOM-005, DOM-008, DOM-011, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

CREATE FUNCTION public.delinquency_submit_regularization(
  p_case_id         uuid,
  p_declared_amount bigint,
  p_reference       text,
  p_receipt_path    text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_bucket        CONSTANT text    := 'delinquency-receipts';
  c_max_reference CONSTANT integer := 100;

  v_client_id   uuid;
  v_case        public.delinquency_cases;
  v_pending     bigint;
  v_reference   text;
  v_replaced_id uuid;
  v_id          uuid;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'delinquency_not_a_client' USING ERRCODE = '42501';
  END IF;

  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'delinquency_case_not_regularizable' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('delinquency_case:' || p_case_id::text, 0));

  SELECT * INTO v_case FROM public.delinquency_cases c WHERE c.id = p_case_id;
  IF NOT FOUND OR v_case.client_id <> v_client_id OR v_case.state <> 'active' THEN
    RAISE EXCEPTION 'delinquency_case_not_regularizable' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(max(b.pending), 0) INTO v_pending
    FROM public.payments_appointment_balances(ARRAY[v_case.appointment_id]) b;
  IF v_pending <= 0 THEN
    RAISE EXCEPTION 'delinquency_case_already_paid' USING ERRCODE = '22023';
  END IF;

  IF p_declared_amount IS NULL OR p_declared_amount <= 0 OR p_declared_amount > v_pending THEN
    RAISE EXCEPTION 'delinquency_declared_amount_invalid' USING ERRCODE = '22023';
  END IF;

  v_reference := nullif(btrim(coalesce(p_reference, '')), '');
  IF length(v_reference) > c_max_reference THEN
    RAISE EXCEPTION 'delinquency_reference_too_long' USING ERRCODE = '22023';
  END IF;

  IF p_receipt_path IS NULL
     OR (storage.foldername(p_receipt_path))[1] IS DISTINCT FROM v_client_id::text
     OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = c_bucket AND o.name = p_receipt_path)
  THEN
    RAISE EXCEPTION 'delinquency_receipt_not_found' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.delinquency_regularizations r WHERE r.receipt_path = p_receipt_path) THEN
    RAISE EXCEPTION 'delinquency_receipt_already_used' USING ERRCODE = '22023';
  END IF;

  UPDATE public.delinquency_regularizations r
     SET state = 'replaced'
   WHERE r.case_id = p_case_id AND r.state = 'pending_approval'
  RETURNING r.id INTO v_replaced_id;

  INSERT INTO public.delinquency_regularizations (case_id, client_id, declared_amount, reference, receipt_path)
  VALUES (p_case_id, v_client_id, p_declared_amount, v_reference, p_receipt_path)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'delinquency.regularization.submitted',
    'delinquency_regularization',
    v_id,
    jsonb_build_object(
      'caseId',         p_case_id,
      'clientId',       v_client_id,
      'declaredAmount', p_declared_amount,
      'pendingToday',   v_pending,
      'replacedId',     v_replaced_id
    )
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_submit_regularization(uuid, bigint, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_submit_regularization(uuid, bigint, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_submit_regularization(uuid, bigint, text, text) TO authenticated;

CREATE FUNCTION public.delinquency_my_account()
RETURNS TABLE (
  case_id          uuid,
  case_state       text,
  appointment_id   uuid,
  pending          bigint,
  since            timestamptz,
  request_id       uuid,
  request_state    text,
  declared_amount  bigint,
  approved_amount  bigint,
  rejection_reason text,
  reviewed_at      timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_settled_window CONSTANT interval := interval '30 days';
  v_client_id uuid;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH mine AS (
    SELECT c.id, c.state, c.appointment_id, c.detected_at
      FROM public.delinquency_cases c
     WHERE c.client_id = v_client_id
       AND (c.state = 'active' OR (c.state = 'settled' AND c.settled_at > now() - c_settled_window))
     ORDER BY c.detected_at, c.id
     LIMIT 200
  )
  SELECT m.id,
         m.state,
         m.appointment_id,
         coalesce(b.pending, 0)::bigint,
         m.detected_at,
         r.id,
         r.state,
         r.declared_amount,
         r.approved_amount,
         r.rejection_reason,
         r.reviewed_at
    FROM mine m
    LEFT JOIN public.payments_appointment_balances(ARRAY(SELECT m2.appointment_id FROM mine m2)) b
      ON b.appointment_id = m.appointment_id
    LEFT JOIN LATERAL (
      SELECT x.* FROM public.delinquency_regularizations x
       WHERE x.case_id = m.id
       ORDER BY x.created_at DESC, (x.state = 'replaced'), x.id DESC
       LIMIT 1
    ) r ON true
   WHERE m.state = 'settled' OR coalesce(b.pending, 0) > 0
   ORDER BY m.detected_at, m.id;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_my_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_my_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_my_account() TO authenticated;
