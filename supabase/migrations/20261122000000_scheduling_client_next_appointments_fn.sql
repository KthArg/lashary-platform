-- 20261122000000_scheduling_client_next_appointments_fn.sql
-- US-NOT-06 · feature scheduling — la próxima cita de cada clienta (contrato: docs/contracts/scheduling-api.md).
-- Una fila por clienta con al menos una cita futura que sigue en pie (pending_approval, approved, confirmed,
-- los estados que ocupan la agenda), con el starts_at de la más cercana. La usa la lista de clientas
-- inactivas de notifications para dejar fuera a quien ya tiene una cita agendada.
-- SECURITY INVOKER y STABLE, como scheduling_client_last_visits: la RLS de scheduling_appointments decide qué
-- se ve y la función no agrega permisos. anon no la ejecuta. idx_scheduling_appointments_client
-- (client_id, starts_at) cubre la clienta y la fecha (PERF-001: sin índice nuevo).
-- Cumplimiento: ARCH-005, INT-003, DOM-003, SEC-001, INT-008.

CREATE FUNCTION public.scheduling_client_next_appointments()
RETURNS TABLE (client_id uuid, next_appointment_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT a.client_id, min(a.starts_at)
    FROM public.scheduling_appointments a
   WHERE a.status IN ('pending_approval', 'approved', 'confirmed')
     AND a.starts_at > now()
     AND a.client_id IS NOT NULL
   GROUP BY a.client_id;
$$;

REVOKE ALL ON FUNCTION public.scheduling_client_next_appointments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_client_next_appointments() FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_client_next_appointments() TO authenticated;
