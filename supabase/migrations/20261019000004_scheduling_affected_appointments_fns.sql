-- 20261019000004_scheduling_affected_appointments_fns.sql
-- US-AGE-05 · feature scheduling — cuántas citas afecta reducir la disponibilidad (criterio 9,
-- trasladado de US-AGE-01). Quitar un bloque semanal, cerrar un día o bloquear un espacio no borra
-- ninguna cita: antes de hacerlo, el panel cuenta cuántas citas vigentes quedan afectadas para
-- advertir y pedir confirmación. Solo cuentan citas pendientes, aprobadas o confirmadas que
-- todavía no terminaron: son las que ocupan espacio (DOM-010).
-- Devuelven solo un número. Corren con los permisos de quien llama (SECURITY INVOKER): la RLS de las
-- citas decide cuáles ve, así que una clienta solo contaría las suyas y el panel (staff) ve todas.
-- Repite la zona del estudio de shared/studio-time.ts, como scheduling_busy_ranges.
-- Cumplimiento: SEC-001, INT-008 (una migración, forward-only).

-- 1. Citas vigentes cuyo espacio ocupado se cruza con un rango: cerrar un día (de medianoche a
--    medianoche, hora del estudio) o bloquear un espacio manualmente.
CREATE FUNCTION public.scheduling_count_appointments_in_range(
  p_resource_id uuid,
  p_from        timestamptz,
  p_to          timestamptz
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer
    FROM public.scheduling_appointments a
   WHERE a.resource_id = p_resource_id
     AND a.status IN ('pending_approval', 'approved', 'confirmed')
     AND a.ends_at > now()
     AND a.occupied_range && tstzrange(p_from, p_to);
$$;

-- 2. Citas vigentes que dejan de caber en el horario si se quita ese bloque semanal: las que caen
--    en su día de la semana y se cruzan con él. Los bloques de un mismo día no se solapan, así que
--    una cita que se cruza con el bloque quitado nunca queda cubierta por los que sobran.
CREATE FUNCTION public.scheduling_count_appointments_affected_by_weekly_block(p_block_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH removed AS (
    SELECT resource_id, weekday, start_min, end_min
      FROM public.scheduling_weekly_availability
     WHERE id = p_block_id
  ),
  placed AS (
    SELECT int4range(
             (extract(hour FROM s.local_start) * 60 + extract(minute FROM s.local_start))::integer,
             (extract(hour FROM s.local_start) * 60 + extract(minute FROM s.local_start)
                + extract(epoch FROM upper(a.occupied_range) - lower(a.occupied_range)) / 60)::integer
           ) AS minutes,
           extract(isodow FROM s.local_start)::smallint AS weekday,
           a.resource_id
      FROM public.scheduling_appointments a
     CROSS JOIN LATERAL (SELECT lower(a.occupied_range) AT TIME ZONE 'America/Costa_Rica' AS local_start) s
     WHERE a.status IN ('pending_approval', 'approved', 'confirmed')
       AND a.ends_at > now()
  )
  SELECT count(*)::integer
    FROM placed p
    JOIN removed r ON r.resource_id = p.resource_id AND r.weekday = p.weekday
   WHERE p.minutes && int4range(r.start_min, r.end_min);
$$;

REVOKE ALL ON FUNCTION public.scheduling_count_appointments_in_range(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_count_appointments_in_range(uuid, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_count_appointments_in_range(uuid, timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.scheduling_count_appointments_affected_by_weekly_block(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_count_appointments_affected_by_weekly_block(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_count_appointments_affected_by_weekly_block(uuid) TO authenticated;
