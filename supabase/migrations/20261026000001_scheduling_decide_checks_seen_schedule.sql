-- 20261026000001_scheduling_decide_checks_seen_schedule.sql
-- US-AGE-10 · feature scheduling — decisión del PO: al aprobar una cita, la administradora aprueba el
-- horario que vio. Si la clienta reagendó justo antes, la cita no se aprueba y la pantalla le avisa el
-- horario nuevo (lo encontró la prueba de concurrencia de reagendar contra aprobar a la vez).
-- `scheduling_decide_appointment` recibe un cuarto parámetro, `p_expected_starts_at`, el inicio que la
-- administradora tenía en pantalla. Solo aprobar lo exige (rechazar no aprueba nada); si no coincide
-- con el inicio vigente, o no se manda, falla con `scheduling_appointment_schedule_changed` sin tocar la
-- cita, y el `DETAIL` trae el inicio y el fin vigentes en milisegundos, separados por «|», para mostrarlos.
-- Toma la cita con `FOR UPDATE` y compara y decide dentro de la misma transacción: un reagendado que
-- llegue a la vez espera y la aprobación lo ve (o al revés: el reagendado ve la cita aprobada y falla).
-- Sigue sin devolver fila si la cita no existe o ya no estaba pendiente. `SECURITY INVOKER`, como antes:
-- la RLS decide quién ve y decide citas. Se reemplaza la función (cambia su firma).
-- Cumplimiento: DOM-011, DOM-012, SEC-001, SEC-002, SEC-005, INT-008 (una migración, forward-only).

DROP FUNCTION public.scheduling_decide_appointment(uuid, text, text);

CREATE FUNCTION public.scheduling_decide_appointment(
  p_appointment_id     uuid,
  p_decision           text,
  p_reason             text DEFAULT NULL,
  p_expected_starts_at timestamptz DEFAULT NULL
)
RETURNS SETOF public.scheduling_appointments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.scheduling_appointments;
BEGIN
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

REVOKE ALL ON FUNCTION public.scheduling_decide_appointment(uuid, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_decide_appointment(uuid, text, text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_decide_appointment(uuid, text, text, timestamptz) TO authenticated;
