-- 20261120000001_delinquency_lift_and_forgive_case_fn.sql
-- US-MOR-05 · feature delinquency — levantar el bloqueo sin pago (criterio 1) y condonar total o
-- parcialmente (criterio 2) una morosidad `active` (contrato: docs/contracts/delinquency-api.md).
--
-- Rehecha tras la auditoría del 2026-11-18 (A3, A4; decisión de Kenny, PO):
-- - Condonar valida contra el SALDO VIVO de la cita (payments_appointment_balances, US-MOR-02), no
--   contra `delinquency_cases.pending` (una foto del saldo al detectar). Con pagos de US-MOR-03 ya no se
--   puede condonar más de lo que realmente queda.
-- - Condonar parcial NO cierra el caso: sigue `active` con `exception_amount` acumulado (lo condonado
--   hasta ahora, puede condonarse más de una vez) hasta que el saldo vivo llegue a cero, momento en el
--   que pasa a `forgiven` (terminal). `delinquency_booking_block` (US-MOR-02) ya filtra por
--   `state = 'active'` y saldo vivo, así que levantar o saldar por completo quita el bloqueo solos, sin
--   más cambios aquí.
--
-- `exception_reason`/`exception_amount` quedan aparte de `pending` porque no aplican a decidir una
-- pending_review y porque el monto condonado es distinto del `pending` original, que nunca se toca
-- (criterio 4: la morosidad original sigue visible con su saldo de siempre). A diferencia de la primera
-- versión, `exception_amount` también puede estar presente en `active` (condonación parcial en curso);
-- `delinquency_lift_case` lo limpia a NULL si levanta un caso que ya tenía condonaciones parciales.
--
-- `delinquency_forgive_case` cruza a `payments` (ARCH-005, INT-003) llamando a
-- payments_record_forgiveness_entry y a payments_appointment_balances, en la misma transacción que el
-- cambio de estado y el evento de bitácora (DOM-005, DOM-011). SECURITY DEFINER porque delinquency_cases
-- no tiene escritura directa para staff, igual que delinquency_decide_case; llama a
-- payments_appointment_balances (SECURITY INVOKER) con los permisos de su dueña, mismo patrón que
-- delinquency_booking_block.
--
-- B4 de la auditoría: la validación de motivo vacío usaba btrim(), que solo recorta espacios y no
-- detecta un motivo de solo salto de línea o tabulador. Se cambia a `!~ '\S'` (sin ningún carácter que
-- no sea espacio en blanco) en las dos funciones y en el CHECK de la tabla.
--
-- N1 de la auditoría del 2026-11-21 (confirmado contra `main` ya con US-MOR-03 mergeada, #943):
-- `delinquency_cases_state_check` y `delinquency_cases_decision_matches_state` los rehace
-- `20261117040000_delinquency_regularizations.sql` (US-MOR-03) agregando `settled`; al aplicarse
-- después por fecha, esta migración los pisaba sin `settled`, y aprobar una regularización que
-- salda la cita (`delinquency_approve_regularization`, que pone `state = 'settled'`) violaba el
-- CHECK. Van como unión con `lifted`/`forgiven`, igual que ya se hizo con el `CHECK` de `kind` de
-- `payments_ledger_entries` (pieza 2). `exception_reason_by_state`/`exception_amount_by_state`
-- tampoco tenían rama para `settled`: cualquier fila con ese estado violaba el CHECK sin importar
-- el valor de `exception_reason`/`exception_amount`. `settled` se trata como `active`: conserva lo
-- que tuviera (una condonación parcial seguida de un pago que termina de saldar la cita no pierde
-- su `exception_amount`), sin exigirlo ni prohibirlo — `delinquency_approve_regularization` no
-- toca esas columnas, así que lo que hubiera antes de la aprobación sigue igual después.
--
-- Cumplimiento: ARCH-005, DOM-005, DOM-011, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

ALTER TABLE public.delinquency_cases
  DROP CONSTRAINT delinquency_cases_decision_matches_state;

ALTER TABLE public.delinquency_cases
  DROP CONSTRAINT delinquency_cases_state_check;

ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_state_check
    CHECK (state IN ('pending_review', 'active', 'dismissed', 'lifted', 'forgiven', 'settled'));

ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_decision_matches_state CHECK (
    (state = 'pending_review' AND decided_at IS NULL AND decided_by IS NULL)
    OR (state IN ('active', 'dismissed', 'lifted', 'forgiven', 'settled') AND decided_at IS NOT NULL AND decided_by IS NOT NULL)
  );

ALTER TABLE public.delinquency_cases
  ADD COLUMN exception_reason text,
  ADD COLUMN exception_amount bigint;

-- Presencia por estado: pending_review/dismissed nunca llevan excepción; lifted/forgiven siempre
-- llevan motivo (forgiven además lleva monto); active y settled pueden llevar ambos (condonación
-- parcial en curso, o ya saldada por un pago tras una condonación parcial) o ninguno.
ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_exception_reason_by_state CHECK (
    (state IN ('pending_review', 'dismissed') AND exception_reason IS NULL)
    OR (state IN ('lifted', 'forgiven') AND exception_reason IS NOT NULL)
    OR state IN ('active', 'settled')
  ),
  ADD CONSTRAINT delinquency_cases_exception_amount_by_state CHECK (
    (state IN ('pending_review', 'dismissed', 'lifted') AND exception_amount IS NULL)
    OR (state = 'forgiven' AND exception_amount IS NOT NULL)
    OR state IN ('active', 'settled')
  ),
  ADD CONSTRAINT delinquency_cases_exception_reason_format CHECK (
    exception_reason IS NULL OR (exception_reason ~ '\S' AND char_length(exception_reason) <= 500)
  ),
  ADD CONSTRAINT delinquency_cases_exception_amount_positive CHECK (
    exception_amount IS NULL OR exception_amount > 0
  );

-- Levanta el bloqueo de una morosidad `active` sin tocar el ledger (criterio 1). Solo admin. Limpia
-- exception_amount a NULL: si el caso tenía condonaciones parciales en curso, levantar decide dejar de
-- perseguir el resto sin registrarlo como condonado.
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

  IF p_reason IS NULL OR p_reason !~ '\S' THEN
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
     SET state = 'lifted', decided_at = now(), decided_by = auth.uid(),
         exception_reason = p_reason, exception_amount = NULL
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

-- Condona parte o todo el saldo VIVO de una morosidad `active` (criterio 2). Deja el caso `active` con
-- exception_amount acumulado si queda saldo, o `forgiven` si el saldo vivo llega a cero. Puede llamarse
-- más de una vez sobre el mismo caso mientras siga `active`. Solo admin.
CREATE FUNCTION public.delinquency_forgive_case(p_case_id uuid, p_amount bigint, p_reason text)
RETURNS public.delinquency_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case          public.delinquency_cases;
  v_live_balance  bigint;
  v_new_balance   bigint;
  v_cumulative    bigint;
  v_next_state    text;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'delinquency_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR p_reason !~ '\S' THEN
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

  SELECT pending INTO v_live_balance
    FROM public.payments_appointment_balances(ARRAY[v_case.appointment_id]);
  v_live_balance := coalesce(v_live_balance, 0);

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_live_balance THEN
    RAISE EXCEPTION 'delinquency_invalid_forgive_amount' USING ERRCODE = '22023';
  END IF;

  PERFORM public.payments_record_forgiveness_entry(v_case.client_id, v_case.appointment_id, p_amount);

  v_new_balance := v_live_balance - p_amount;
  v_cumulative := coalesce(v_case.exception_amount, 0) + p_amount;
  v_next_state := CASE WHEN v_new_balance <= 0 THEN 'forgiven' ELSE 'active' END;

  UPDATE public.delinquency_cases
     SET state = v_next_state,
         decided_at = now(),
         decided_by = auth.uid(),
         exception_reason = p_reason,
         exception_amount = v_cumulative
   WHERE id = p_case_id
  RETURNING * INTO v_case;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(), 'delinquency.case.forgiven', 'delinquency_case', v_case.id,
    jsonb_build_object(
      'clientId',         v_case.client_id,
      'appointmentId',    v_case.appointment_id,
      'pending',          v_case.pending,
      'amount',           p_amount,
      'cumulativeAmount', v_cumulative,
      'remainingBalance', v_new_balance,
      'reason',           p_reason,
      'closed',           v_next_state = 'forgiven'
    )
  );

  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_forgive_case(uuid, bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_forgive_case(uuid, bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_forgive_case(uuid, bigint, text) TO authenticated;

-- Listado por caso de las morosidades `active` (delinquency_list_active agrega por clienta; esta
-- función da el detalle que necesitan los botones de levantar/condonar). pending es el SALDO VIVO de
-- la cita (payments_appointment_balances, ARCH-005), no la foto que guardó la detección: es lo que
-- hace falta para acotar cuánto puede condonarse de verdad (A3). exception_amount es lo condonado hasta
-- ahora (null si nunca se condonó nada). Mismo patrón de cursor que delinquency_list_active, por el par
-- (since, case_id).
CREATE FUNCTION public.delinquency_list_active_cases(
  p_limit           integer,
  p_after_since     timestamptz DEFAULT NULL,
  p_after_case_id   uuid DEFAULT NULL
)
RETURNS TABLE (case_id uuid, client_id uuid, appointment_id uuid, pending bigint, exception_amount bigint, since timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH candidates AS (
    SELECT c.id, c.client_id, c.appointment_id, c.exception_amount, c.detected_at
      FROM public.delinquency_cases c
     WHERE c.state = 'active'
       AND (
         p_after_since IS NULL
         OR c.detected_at < p_after_since
         OR (c.detected_at = p_after_since AND c.id > coalesce(p_after_case_id, '00000000-0000-0000-0000-000000000000'::uuid))
       )
     ORDER BY c.detected_at DESC, c.id
     LIMIT greatest(1, least(coalesce(p_limit, 100), 100))
  )
  SELECT cd.id, cd.client_id, cd.appointment_id,
         coalesce(b.pending, 0)::bigint, cd.exception_amount, cd.detected_at
    FROM candidates cd
    LEFT JOIN public.payments_appointment_balances(ARRAY(SELECT appointment_id FROM candidates)) b
      ON b.appointment_id = cd.appointment_id
   ORDER BY cd.detected_at DESC, cd.id;
$$;

REVOKE ALL ON FUNCTION public.delinquency_list_active_cases(integer, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_list_active_cases(integer, timestamptz, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_list_active_cases(integer, timestamptz, uuid) TO authenticated;
