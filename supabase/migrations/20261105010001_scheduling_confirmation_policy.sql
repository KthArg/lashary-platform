-- 20261105010001_scheduling_confirmation_policy.sql
-- US-NOT-08 · feature scheduling — criterio 4: horas antes de la cita a partir de las cuales una cita
-- sin confirmar se destaca en la agenda diaria. Arranca en 48 (decisión del PO del 2026-11-05) y 0
-- significa no destacar. Solo destaca: nada se cancela solo (ADR-0003, DOM-012).
-- Mismo diseño que `scheduling_cancellation_policy`: una fila, tope en `CHECK` y una función como único
-- camino de cambio, que deja el evento en la misma transacción (INT-003).
-- Cumplimiento: DOM-012, SEC-001, SEC-002, INT-003, INT-008 (una migración, forward-only).

CREATE TABLE public.scheduling_confirmation_policy (
  singleton                   boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  confirmation_deadline_hours integer NOT NULL
    CHECK (confirmation_deadline_hours >= 0 AND confirmation_deadline_hours <= 720)
);

INSERT INTO public.scheduling_confirmation_policy (singleton, confirmation_deadline_hours) VALUES (true, 48);

ALTER TABLE public.scheduling_confirmation_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_confirmation_policy_select_staff"
  ON public.scheduling_confirmation_policy
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

REVOKE ALL ON public.scheduling_confirmation_policy FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.scheduling_confirmation_policy TO authenticated;

CREATE FUNCTION public.scheduling_change_confirmation_deadline(p_hours integer)
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
    RAISE EXCEPTION 'scheduling_invalid_confirmation_deadline';
  END IF;

  SELECT policy.confirmation_deadline_hours INTO v_previous
    FROM public.scheduling_confirmation_policy policy
   WHERE policy.singleton
     FOR UPDATE;

  IF v_previous IS NULL THEN
    RAISE EXCEPTION 'scheduling_confirmation_policy_missing';
  END IF;

  IF v_previous <> p_hours THEN
    UPDATE public.scheduling_confirmation_policy
       SET confirmation_deadline_hours = p_hours
     WHERE singleton;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.confirmation_deadline.changed',
      'scheduling_confirmation_policy',
      '00000000-0000-0000-0000-00000000c0a2',
      jsonb_build_object('previousHours', v_previous, 'newHours', p_hours)
    );
  END IF;

  RETURN QUERY SELECT v_previous, p_hours;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_change_confirmation_deadline(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_change_confirmation_deadline(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_change_confirmation_deadline(integer) TO authenticated;
