-- 20261023000000_scheduling_change_cancellation_window_fn.sql
-- US-AGE-06 · feature scheduling — corrección de la revisión de Kenny: el tope de la ventana de
-- cancelación, el evento de auditoría y el valor «anterior» los garantizaba solo TypeScript. Quien
-- llamara PostgREST con la sesión de la administradora, sin pasar por la pantalla, podía poner 100000
-- horas, y ese cambio no dejaba rastro (INT-003 pide que los eventos de auditoría salgan desde SQL).
-- 1. El tope pasa a la tabla: 0 a 720 horas (30 días), como `CHECK`.
-- 2. El cambio es una función, `scheduling_change_cancellation_window`, que valida, lee el valor
--    anterior con `FOR UPDATE` (dos cambios a la vez no registran un «anterior» que ya no era el
--    vigente), actualiza y deja el evento en la misma transacción: si la bitácora falla, el cambio también.
-- 3. Se quita el `UPDATE` directo de la columna: la función es el único camino.
-- Es `SECURITY DEFINER` y no `INVOKER` porque, sin el `UPDATE` directo, quien llama ya no tiene permiso
-- sobre la tabla; en su lugar la función exige explícitamente a la administradora (`auth_is_admin()`),
-- igual que las demás funciones de esta feature que escriben en la bitácora (INT-003).
-- Cumplimiento: DOM-002, SEC-001, SEC-002, INT-003, INT-008 (una migración, forward-only).

ALTER TABLE public.scheduling_cancellation_policy
  ADD CONSTRAINT scheduling_cancellation_policy_window_max CHECK (cancellation_window_hours <= 720);

REVOKE UPDATE (cancellation_window_hours) ON public.scheduling_cancellation_policy FROM authenticated;
DROP POLICY "scheduling_cancellation_policy_update_admin" ON public.scheduling_cancellation_policy;

CREATE FUNCTION public.scheduling_change_cancellation_window(p_hours integer)
RETURNS TABLE (previous_hours integer, new_hours integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous integer;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'scheduling_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_hours IS NULL OR p_hours < 0 OR p_hours > 720 THEN
    RAISE EXCEPTION 'scheduling_invalid_cancellation_window';
  END IF;

  SELECT policy.cancellation_window_hours INTO v_previous
    FROM public.scheduling_cancellation_policy policy
   WHERE policy.singleton
     FOR UPDATE;

  IF v_previous IS NULL THEN
    RAISE EXCEPTION 'scheduling_cancellation_policy_missing';
  END IF;

  IF v_previous <> p_hours THEN
    UPDATE public.scheduling_cancellation_policy
       SET cancellation_window_hours = p_hours
     WHERE singleton;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.cancellation_window.changed',
      'scheduling_cancellation_policy',
      '00000000-0000-0000-0000-00000000c0a1',
      jsonb_build_object('previousHours', v_previous, 'newHours', p_hours)
    );
  END IF;

  RETURN QUERY SELECT v_previous, p_hours;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_change_cancellation_window(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_change_cancellation_window(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_change_cancellation_window(integer) TO authenticated;
