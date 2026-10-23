-- 20261022000002_scheduling_list_my_appointments_fn.sql
-- US-AGE-06 · feature scheduling — corrección de la revisión (defensa en profundidad): «mis citas»
-- leía `scheduling_appointments` directo y dependía solo de la RLS y del rol para que cada clienta viera
-- únicamente las suyas. Ahora la lectura pasa por una función que resuelve la clienta desde la sesión
-- (`clients_current_profile_id()`, SEC-005) y filtra por ella de forma explícita, igual que cotizar y
-- cancelar: si una política cambiara por error, esta lectura seguiría mostrando solo las citas de quien
-- la llama. Sin perfil de clienta (administradora, anónimo) devuelve cero filas.
-- Solo las citas activas que no han empezado, las más próximas primero y con tope (PERF-002): el tope
-- que pide la pantalla no puede superar el máximo de la función.
-- Cumplimiento: DOM-002, SEC-001, SEC-002, SEC-005, PERF-002, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_list_my_appointments(p_now timestamptz, p_limit integer)
RETURNS TABLE (
  id               uuid,
  starts_at        timestamptz,
  ends_at          timestamptz,
  technique_name   text,
  status           text,
  is_first_time    boolean,
  service_price    bigint,
  deposit_required bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.starts_at, a.ends_at, a.technique_name, a.status,
         a.is_first_time, a.service_price, a.deposit_required
    FROM public.scheduling_appointments a
   WHERE a.client_id = public.clients_current_profile_id()
     AND a.status IN ('pending_approval', 'approved', 'confirmed')
     AND a.starts_at > p_now
   ORDER BY a.starts_at ASC
   LIMIT greatest(least(coalesce(p_limit, 50), 100), 0);
$$;

REVOKE ALL ON FUNCTION public.scheduling_list_my_appointments(timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_list_my_appointments(timestamptz, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_list_my_appointments(timestamptz, integer) TO authenticated;
