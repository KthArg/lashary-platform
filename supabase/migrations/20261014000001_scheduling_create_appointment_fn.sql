-- US-AGE-09 · scheduling — crea una cita serializando por recurso (ADR-0002, addendum).
-- El INSERT directo con solapes simultáneos deadlockea (40P01, hasta 8 s con N=10); con el lock, N=10 ≈ 27 ms.
-- El lock solo ordena a quienes compiten: la garantía de no-solape sigue siendo el exclusion constraint (DOM-010).

CREATE FUNCTION public.scheduling_create_appointment(
  p_resource_id    uuid,
  p_starts_at      timestamptz,
  p_ends_at        timestamptz,
  p_occupied_range tstzrange
)
RETURNS public.scheduling_appointments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  created public.scheduling_appointments;
BEGIN
  -- Lock transaccional por recurso: se libera solo al terminar la transacción (commit o rollback).
  -- El prefijo evita chocar con otros usos de advisory locks en la base.
  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || p_resource_id::text, 0));

  INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
  VALUES (p_resource_id, p_starts_at, p_ends_at, p_occupied_range)
  RETURNING * INTO created;

  RETURN created;
END;
$$;

-- Solo sesiones autenticadas; la RLS decide después si pueden insertar (hoy, solo staff).
REVOKE ALL ON FUNCTION public.scheduling_create_appointment(uuid, timestamptz, timestamptz, tstzrange) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_create_appointment(uuid, timestamptz, timestamptz, tstzrange) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_create_appointment(uuid, timestamptz, timestamptz, tstzrange) TO authenticated;
