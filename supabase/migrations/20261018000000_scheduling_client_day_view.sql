-- 20261018000000_scheduling_client_day_view.sql
-- US-AGE-02 · feature scheduling — lectura del calendario por día para la clienta.
-- Las tablas de disponibilidad y de citas siguen siendo solo de staff (20261015000000 y
-- 20261014000000). La clienta no las lee: lee dos funciones que devuelven solo horas, sin motivo
-- del bloqueo, sin quién reservó ni qué servicio (criterio 2), y sin caché, así que un cambio de
-- la administradora se ve en la siguiente lectura (criterio 4, trasladado de US-AGE-01).
-- Cumplimiento: SEC-001 (RLS intacta; la función expone columnas mínimas), SEC-002 (pgTAP
--   scheduling_client_day_view.test.sql), PERF-002 (resultados acotados), INT-008 (una migración
--   por historia, forward-only).

-- 1. Horario abierto de un día: los bloques semanales del día de la semana de p_day (ISO 8601,
--    1 = lunes … 7 = domingo), o ninguno si ese día está cerrado.
CREATE FUNCTION public.scheduling_open_hours(p_resource_id uuid, p_day date)
RETURNS TABLE (start_min integer, end_min integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT w.start_min, w.end_min
    FROM public.scheduling_weekly_availability w
   WHERE w.resource_id = p_resource_id
     AND w.weekday = extract(isodow FROM p_day)::smallint
     AND NOT EXISTS (
       SELECT 1
         FROM public.scheduling_closed_dates c
        WHERE c.resource_id = p_resource_id
          AND c.closed_on = p_day
     )
   ORDER BY w.start_min
   LIMIT 100;
$$;

-- 2. Rangos ocupados entre dos instantes: bloqueos manuales y citas activas (los mismos estados
--    que ocupan espacio en el constraint de no-solape de US-AGE-09). Una ventana de más de dos
--    días no devuelve nada: el calendario pide un día a la vez.
CREATE FUNCTION public.scheduling_busy_ranges(
  p_resource_id uuid,
  p_from        timestamptz,
  p_to          timestamptz
)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT busy.starts_at, busy.ends_at
    FROM (
      SELECT b.starts_at, b.ends_at
        FROM public.scheduling_manual_blocks b
       WHERE b.resource_id = p_resource_id
         AND tstzrange(b.starts_at, b.ends_at) && tstzrange(LEAST(p_from, p_to), GREATEST(p_from, p_to))
      UNION ALL
      SELECT lower(a.occupied_range), upper(a.occupied_range)
        FROM public.scheduling_appointments a
       WHERE a.resource_id = p_resource_id
         AND a.status IN ('pending_approval', 'approved', 'confirmed')
         AND a.occupied_range && tstzrange(LEAST(p_from, p_to), GREATEST(p_from, p_to))
    ) busy
   WHERE p_from < p_to
     AND p_to - p_from <= interval '2 days'
   ORDER BY busy.starts_at
   LIMIT 200;
$$;

-- 3. Solo usuarias autenticadas: el calendario vive en el portal, que exige sesión.
REVOKE ALL ON FUNCTION public.scheduling_open_hours(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_open_hours(uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_open_hours(uuid, date) TO authenticated;

REVOKE ALL ON FUNCTION public.scheduling_busy_ranges(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_busy_ranges(uuid, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_busy_ranges(uuid, timestamptz, timestamptz) TO authenticated;
