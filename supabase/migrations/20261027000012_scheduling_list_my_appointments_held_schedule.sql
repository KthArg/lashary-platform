-- 20261027000012_scheduling_list_my_appointments_held_schedule.sql
-- US-AGE-10 · feature scheduling — hallazgo A2: «Mis citas» le dice a la clienta que, mientras la
-- administradora decide su reagendado, su horario aprobado se mantiene. `scheduling_list_my_appointments`
-- devuelve además `held_starts_at` y `held_ends_at`, el horario que la cita guarda (20261027000006), o nulos.
-- Cambia el tipo de retorno, así que se reemplaza la función (DROP y CREATE, con los mismos permisos). El
-- resto es el cuerpo de 20261022000002: la clienta sale de la sesión, solo citas activas que no empezaron,
-- las más próximas primero y con tope.
-- Cumplimiento: DOM-002, SEC-001, SEC-002, SEC-005, PERF-002, INT-008 (una migración, forward-only).

DROP FUNCTION public.scheduling_list_my_appointments(timestamptz, integer);

CREATE FUNCTION public.scheduling_list_my_appointments(p_now timestamptz, p_limit integer)
RETURNS TABLE (
  id               uuid,
  starts_at        timestamptz,
  ends_at          timestamptz,
  technique_name   text,
  status           text,
  is_first_time    boolean,
  service_price    bigint,
  deposit_required bigint,
  held_starts_at   timestamptz,
  held_ends_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.starts_at, a.ends_at, a.technique_name, a.status,
         a.is_first_time, a.service_price, a.deposit_required,
         a.previous_starts_at, a.previous_ends_at
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
