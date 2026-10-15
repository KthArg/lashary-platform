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

-- Solo las columnas de la decisión son editables: el horario y el rango ocupado no cambian.
REVOKE UPDATE ON public.scheduling_appointments FROM authenticated;
GRANT UPDATE (status, decided_by, decided_at, decision_reason)
  ON public.scheduling_appointments TO authenticated;

-- Quien decide sale de la sesión (auth.uid()), nunca de un parámetro del cliente (SEC-005).
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
         decided_by = auth.uid(),
         decided_at = now(),
         decision_reason = p_reason
   WHERE id = p_appointment_id
     AND status = 'pending_approval'
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.scheduling_decide_appointment(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_decide_appointment(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_decide_appointment(uuid, text, text) TO authenticated;
