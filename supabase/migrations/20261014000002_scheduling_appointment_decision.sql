-- US-AGE-09 · scheduling — aprobar o rechazar una cita pendiente (ADR-0003).

ALTER TABLE public.scheduling_appointments
  ADD COLUMN decided_by      uuid REFERENCES auth.users(id),
  ADD COLUMN decided_at      timestamptz,
  ADD COLUMN decision_reason text CHECK (length(decision_reason) <= 500);

CREATE INDEX idx_scheduling_appointments_decided_by
  ON public.scheduling_appointments (decided_by) WHERE decided_by IS NOT NULL;

-- Staff solo decide citas pendientes y solo hacia aprobada o rechazada. Rechazar saca la cita del
-- constraint de no-solape y libera el espacio.
CREATE POLICY "scheduling_appointments_decide_staff"
  ON public.scheduling_appointments
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_staff() AND status = 'pending_approval')
  WITH CHECK (public.auth_is_staff() AND status IN ('approved', 'rejected'));

-- Una cita nueva siempre nace pendiente y sin decisión: aprobar y rechazar pasan solo por el UPDATE.
ALTER POLICY "scheduling_appointments_insert_staff"
  ON public.scheduling_appointments
  WITH CHECK (
    public.auth_is_staff()
    AND status = 'pending_approval'
    AND decided_by IS NULL AND decided_at IS NULL AND decision_reason IS NULL
  );

-- Solo estado y motivo son editables: el horario, el rango ocupado y quién decidió no se tocan.
REVOKE UPDATE ON public.scheduling_appointments FROM authenticated;
GRANT UPDATE (status, decision_reason) ON public.scheduling_appointments TO authenticated;

-- Quién decide y cuándo los fija la base, también ante un UPDATE directo que se salte la función.
CREATE FUNCTION public.scheduling_stamp_decision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.decided_by := auth.uid();
  NEW.decided_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER scheduling_appointments_stamp_decision
  BEFORE UPDATE OF status ON public.scheduling_appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.scheduling_stamp_decision();

-- Sin fila devuelta: la cita no existe o ya no estaba pendiente.
CREATE FUNCTION public.scheduling_decide_appointment(
  p_appointment_id uuid,
  p_decision       text,
  p_reason         text DEFAULT NULL
)
RETURNS SETOF public.scheduling_appointments
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.scheduling_appointments
     SET status = p_decision,
         decision_reason = p_reason
   WHERE id = p_appointment_id
     AND status = 'pending_approval'
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.scheduling_decide_appointment(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_decide_appointment(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_decide_appointment(uuid, text, text) TO authenticated;
