-- 20261027000008_scheduling_decide_settles_previous_schedule.sql
-- US-AGE-10 · feature scheduling — hallazgo A2: qué pasa con el horario guardado de un reagendado
-- (migraciones 20261027000006 y 20261027000007) cuando la cita sale de pendiente.
-- 1. Aprobar: la cita se queda en el horario nuevo y suelta el guardado.
-- 2. Rechazar: la cita vuelve al horario y al estado guardados (aprobada o confirmada) y suelta el nuevo.
--    El anticipo, el precio y el contador de reagendados quedan como estaban (el intento cuenta: propuesta
--    del equipo, pendiente del PO). Deja `scheduling.appointment.reschedule_reverted` en la bitácora, en la
--    misma transacción (INT-003), con el horario rechazado, el devuelto y el motivo.
-- 3. Cualquier otra salida (cancelar, por ejemplo) suelta los dos espacios.
-- Lo hace un trigger `BEFORE UPDATE OF status`, así vale para la función de decidir, la de cancelar y un
-- UPDATE directo de staff. Corre antes que `scheduling_appointments_stamp_decision` (orden alfabético), que
-- sigue fijando quién decidió y cuándo. El horario guardado nunca choca al devolverlo: ninguna otra cita
-- pudo tomarlo (constraint de 20261027000006).
-- `scheduling_decide_appointment` pasa a `SECURITY DEFINER`: con RLS, la política de staff solo deja
-- terminar una cita en `approved` o `rejected`, y devolverla a `confirmed` fallaría. Repite a mano lo que
-- antes hacía la RLS: quien no es staff no decide nada (sin fila, como antes) y la decisión solo puede ser
-- aprobar o rechazar (`42501`). El resto del cuerpo es el de 20261027000005. Misma firma: `CREATE OR
-- REPLACE` conserva los permisos.
-- Cumplimiento: DOM-010, DOM-011, SEC-001, SEC-002, INT-003, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_settle_previous_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'rejected' THEN
    NEW.status         := OLD.previous_status;
    NEW.starts_at      := OLD.previous_starts_at;
    NEW.ends_at        := OLD.previous_ends_at;
    NEW.occupied_range := OLD.previous_occupied_range;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.appointment.reschedule_reverted',
      'scheduling_appointment',
      OLD.id,
      jsonb_build_object(
        'rejectedStartsAt', OLD.starts_at,
        'rejectedEndsAt',   OLD.ends_at,
        'restoredStartsAt', OLD.previous_starts_at,
        'restoredEndsAt',   OLD.previous_ends_at,
        'restoredStatus',   OLD.previous_status,
        'reason',           NEW.decision_reason
      )
    );
  END IF;

  NEW.previous_starts_at      := NULL;
  NEW.previous_ends_at        := NULL;
  NEW.previous_occupied_range := NULL;
  NEW.previous_status         := NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER scheduling_appointments_settle_previous_schedule
  BEFORE UPDATE OF status ON public.scheduling_appointments
  FOR EACH ROW
  WHEN (OLD.previous_status IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.scheduling_settle_previous_schedule();

CREATE OR REPLACE FUNCTION public.scheduling_decide_appointment(
  p_appointment_id     uuid,
  p_decision           text,
  p_reason             text DEFAULT NULL,
  p_expected_starts_at timestamptz DEFAULT NULL
)
RETURNS SETOF public.scheduling_appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.scheduling_appointments;
BEGIN
  IF NOT public.auth_is_staff() THEN
    RETURN;
  END IF;

  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'scheduling_invalid_decision' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_current
    FROM public.scheduling_appointments a
   WHERE a.id = p_appointment_id
     AND a.status = 'pending_approval'
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_decision = 'approved' AND p_expected_starts_at IS DISTINCT FROM v_current.starts_at THEN
    RAISE EXCEPTION 'scheduling_appointment_schedule_changed'
      USING DETAIL = floor(extract(epoch FROM v_current.starts_at) * 1000)::bigint::text
                     || '|' || floor(extract(epoch FROM v_current.ends_at) * 1000)::bigint::text;
  END IF;

  RETURN QUERY
    WITH decided AS (
      UPDATE public.scheduling_appointments a
         SET status = p_decision,
             decision_reason = p_reason
       WHERE a.id = v_current.id
      RETURNING a.*
    )
    SELECT * FROM decided;
END;
$$;
