-- 20261027000004_scheduling_reschedule_limit_max_3.sql
-- US-AGE-10 · feature scheduling — el PO fijó en 3 el máximo del tope de reagendados por cita
-- (antes estaba en 10, una cifra puesta por el equipo). La administradora puede elegir de 0 a 3.
-- Forward-only: no se edita la migración anterior. Sube el valor vigente a 3 como mucho (si alguien lo
-- había puesto en más), cambia el `CHECK` de la tabla y repone la función de cambio con el mismo
-- cuerpo y el nuevo máximo. Los permisos de la función no cambian (`CREATE OR REPLACE` los conserva).
-- Cumplimiento: DOM-012, SEC-001, INT-003, INT-008 (una migración, forward-only).

UPDATE public.scheduling_reschedule_policy SET max_reschedules = LEAST(max_reschedules, 3);

ALTER TABLE public.scheduling_reschedule_policy
  DROP CONSTRAINT scheduling_reschedule_policy_max_reschedules_check;

ALTER TABLE public.scheduling_reschedule_policy
  ADD CONSTRAINT scheduling_reschedule_policy_max_reschedules_check
  CHECK (max_reschedules >= 0 AND max_reschedules <= 3);

CREATE OR REPLACE FUNCTION public.scheduling_change_reschedule_limit(p_max integer)
RETURNS TABLE (previous_max integer, new_max integer)
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

  IF p_max IS NULL OR p_max < 0 OR p_max > 3 THEN
    RAISE EXCEPTION 'scheduling_invalid_reschedule_limit';
  END IF;

  SELECT policy.max_reschedules INTO v_previous
    FROM public.scheduling_reschedule_policy policy
   WHERE policy.singleton
     FOR UPDATE;

  IF v_previous IS NULL THEN
    RAISE EXCEPTION 'scheduling_reschedule_policy_missing';
  END IF;

  IF v_previous <> p_max THEN
    UPDATE public.scheduling_reschedule_policy
       SET max_reschedules = p_max
     WHERE singleton;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.reschedule_limit.changed',
      'scheduling_reschedule_policy',
      '00000000-0000-0000-0000-00000000c0a2',
      jsonb_build_object('previousMax', v_previous, 'newMax', p_max)
    );
  END IF;

  RETURN QUERY SELECT v_previous, p_max;
END;
$$;
