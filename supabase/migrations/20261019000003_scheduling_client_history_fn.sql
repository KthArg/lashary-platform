-- 20261019000003_scheduling_client_history_fn.sql
-- US-AGE-05 · feature scheduling — primera vez o re-aplicación según el historial (criterio 10,
-- trasladado de US-AGE-03). La clienta tiene historial con una técnica si alguna de sus citas con
-- esa técnica quedó completada; una cita pendiente, aprobada, confirmada, rechazada, cancelada o
-- con ausencia no cuenta. La clienta sale de la sesión (SEC-005), no de un parámetro: nadie puede
-- preguntar por el historial de otra. Corre con los permisos de quien llama (SECURITY INVOKER), así
-- que la RLS de las citas y de los perfiles también lo limita: una sesión de staff sin perfil de
-- clienta recibe falso.
-- Cumplimiento: SEC-001, SEC-005, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_has_completed_appointment(p_technique_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.scheduling_appointments a
      JOIN public.clients_profiles c ON c.id = a.client_id
     WHERE c.user_id = auth.uid()
       AND a.technique_id = p_technique_id
       AND a.status = 'completed'
  );
$$;

REVOKE ALL ON FUNCTION public.scheduling_has_completed_appointment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_has_completed_appointment(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_has_completed_appointment(uuid) TO authenticated;
