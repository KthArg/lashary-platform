CREATE OR REPLACE FUNCTION public.notifications_reconcile_dropped_notices()
RETURNS TABLE (resolved integer, still_open integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row      public.notifications_dropped_notices;
  v_event    public.audit_events;
  v_resolved integer := 0;
  c_max_attempts CONSTANT integer := 5;
BEGIN
  IF NOT (SELECT public.auth_is_staff()) THEN
    RAISE EXCEPTION 'notifications_reconcile_dropped_notices: solo el personal puede reintentar avisos perdidos' USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT d.* FROM public.notifications_dropped_notices d
    WHERE d.resolved_at IS NULL AND d.attempts < c_max_attempts
    ORDER BY d.attempts, d.created_at
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      SELECT e.* INTO v_event FROM public.audit_events e WHERE e.id = v_row.event_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'el evento % ya no existe en la bitácora', v_row.event_id;
      END IF;

      IF v_event.action IN ('scheduling.appointment.cancelled', 'scheduling.appointment.rescheduled') THEN
        PERFORM public.scheduling_register_appointment_change(v_event);
        PERFORM public.notifications_discard_client_notices(v_event.entity_id, v_event.created_at);
      ELSIF v_event.action IN ('scheduling.appointment.reschedule_reverted', 'scheduling.appointment.reschedule_expired') THEN
        IF v_event.action = 'scheduling.appointment.reschedule_expired' THEN
          DELETE FROM public.notifications_client_notices
           WHERE appointment_id = v_event.entity_id
             AND kind = 'reschedule_rejected'
             AND status = 'pending'
             AND created_at = v_event.created_at;
        END IF;
        PERFORM public.scheduling_register_reschedule_outcome(v_event);
      ELSE
        RAISE EXCEPTION 'la acción % no tiene aviso que reintentar', v_event.action;
      END IF;

      UPDATE public.notifications_dropped_notices SET resolved_at = now() WHERE id = v_row.id;
      v_resolved := v_resolved + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.notifications_dropped_notices
         SET attempts = attempts + 1, error = left(coalesce(nullif(btrim(SQLERRM), ''), 'sin detalle'), 500)
       WHERE id = v_row.id;
    END;
  END LOOP;

  RETURN QUERY
  SELECT v_resolved, (SELECT count(*)::integer FROM public.notifications_dropped_notices WHERE resolved_at IS NULL);
END;
$$;
