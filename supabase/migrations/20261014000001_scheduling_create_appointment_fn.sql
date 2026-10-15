-- 20261014000001_scheduling_create_appointment_fn.sql
-- US-AGE-09 · feature scheduling — crear una cita serializando a quienes compiten por el mismo
-- recurso. Cumplimiento: DOM-010 (el exclusion constraint sigue siendo LA garantía), SEC-001
-- (SECURITY INVOKER: la RLS de la tabla aplica a quien llama), PERF-001 (medido antes de agregarla),
-- INT-008 (una migración, forward-only).
--
-- Por qué existe. Con INSERT directo, dos citas solapadas en vuelo a la vez se esperan una a la
-- otra al validar el constraint y quedan en deadlock; Postgres aborta a una tras deadlock_timeout
-- (1 s) con 40P01 en vez de 23P01. Medido en Postgres local, N inserciones simultáneas al mismo
-- espacio: N=2 → 1 s y un 40P01 la mitad de las veces; N=5 → 4 s; N=10 → 8 s, que pasa el
-- statement_timeout de Supabase y corta las peticiones. Con el lock de abajo: N=10 → ~27 ms, ningún
-- 40P01, un ganador y nueve 23P01 limpios. Siempre ganó exactamente una: el problema era latencia
-- y estabilidad, no integridad.
--
-- El lock NO reemplaza al constraint (ADR-0002 descarta los advisory locks como garantía, y sigue
-- siendo así): solo ordena a los que compiten. Si alguien inserta una cita por otro camino sin
-- pasar por esta función, el constraint la protege igual.

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
