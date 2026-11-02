-- 20261027000013_scheduling_expire_undecided_reschedules_fn.sql
-- US-AGE-10 · feature scheduling — pregunta 4 al PO (aprobada el 2026-10-29): si la administradora no
-- decide un reagendado a tiempo, la cita vuelve sola a su horario aprobado, como si hubiera rechazado el
-- cambio (DOM-012: consecuencia automática escrita en el SPEC y aprobada por el PO).
-- «A tiempo» es antes de lo primero que llegue: 24 horas antes del horario aprobado guardado (así el
-- recordatorio de US-NOT-03, que sale 24 horas antes, lleva la hora correcta) o el inicio del horario
-- nuevo pedido, si es antes (una cita no puede llegar a su hora sin estar aprobada).
-- `scheduling_expire_undecided_reschedules()` la llama el ciclo de recordatorios de US-NOT-03 (cada 15
-- minutos, autenticado como staff). Por cada reagendado vencido pasa la cita a `rejected`: el trigger de
-- 20261027000008 la devuelve al horario y estado guardados, suelta el horario nuevo y deja
-- `scheduling.appointment.reschedule_reverted`; esta función agrega `scheduling.appointment.reschedule_expired`
-- con el plazo vencido, en la misma transacción (INT-003). Devuelve cuántas citas venció.
-- Toma las citas con `FOR UPDATE SKIP LOCKED`: si la administradora o la clienta tienen la cita tomada en
-- ese momento (aprobando, rechazando, cancelando), esta corrida la salta y la próxima la vuelve a mirar;
-- quien gane primero decide y la otra ya no la encuentra pendiente.
-- `SECURITY DEFINER` por lo mismo que `scheduling_decide_appointment` (devolver a `confirmed`); exige staff.
-- Cumplimiento: DOM-011, DOM-012, SEC-001, INT-003, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_expire_undecided_reschedules()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_decision_lead CONSTANT interval := interval '24 hours';

  v_expired     public.scheduling_appointments;
  v_deadline    timestamptz;
  v_count       integer := 0;
BEGIN
  IF NOT public.auth_is_staff() THEN
    RAISE EXCEPTION 'scheduling_not_staff' USING ERRCODE = '42501';
  END IF;

  FOR v_expired IN
    SELECT *
      FROM public.scheduling_appointments a
     WHERE a.status = 'pending_approval'
       AND a.previous_status IS NOT NULL
       AND LEAST(a.previous_starts_at - c_decision_lead, a.starts_at) <= now()
     ORDER BY a.previous_starts_at
       FOR UPDATE SKIP LOCKED
  LOOP
    v_deadline := LEAST(v_expired.previous_starts_at - c_decision_lead, v_expired.starts_at);

    UPDATE public.scheduling_appointments a
       SET status = 'rejected',
           decision_reason = NULL
     WHERE a.id = v_expired.id;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.appointment.reschedule_expired',
      'scheduling_appointment',
      v_expired.id,
      jsonb_build_object(
        'deadline',         v_deadline,
        'expiredStartsAt',  v_expired.starts_at,
        'restoredStartsAt', v_expired.previous_starts_at,
        'restoredStatus',   v_expired.previous_status
      )
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_expire_undecided_reschedules() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_expire_undecided_reschedules() FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_expire_undecided_reschedules() TO authenticated;
