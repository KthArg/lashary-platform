-- 20261018000001_scheduling_busy_ranges_by_day.sql
-- US-AGE-02 · feature scheduling — corrección de la revisión: scheduling_busy_ranges de
-- 20261018000000_scheduling_client_day_view.sql devolvía cada cita con su inicio y su fin exactos,
-- y de esa duración se podía deducir el servicio (criterio 2). La reemplaza una versión por fecha
-- que devuelve lo ocupado unido, recortado al horario y redondeado a la grilla de espacios.
-- Cumplimiento: SEC-001 (RLS intacta; la función expone columnas mínimas), SEC-002 (pgTAP
--   scheduling_client_day_view.test.sql), PERF-002 (resultados acotados), INT-008 (forward-only:
--   no se edita la migración anterior).

DROP FUNCTION public.scheduling_busy_ranges(uuid, timestamptz, timestamptz);

-- Lo ocupado de un día, reducido a lo que el calendario necesita para marcar un espacio como
--    ocupado (criterio 2). Bloqueos manuales y citas activas (los mismos estados que ocupan espacio
--    en el constraint de no-solape de US-AGE-09) se unen en un solo conjunto: no se distingue una
--    cita de un bloqueo ni se cuentan citas. Se recorta al horario abierto de ese día y cada final
--    se redondea hacia arriba a la grilla de 30 minutos que empieza en cada bloque abierto, así no
--    se lee el final exacto de una cita (su duración y, por ella, el servicio).
--    Los espacios de computeDaySlots (domain/day-slots.ts) no cambian: empiezan en esa grilla, y
--    empezar antes de un final es lo mismo que empezar antes de ese final redondeado.
--    El 30 es SLOT_INTERVAL_MIN y la zona es la del estudio (shared/studio-time.ts): si cambian,
--    cambian aquí.
CREATE FUNCTION public.scheduling_busy_ranges(p_resource_id uuid, p_day date)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH open_block AS (
    SELECT (p_day + make_interval(mins => lower(r))) AT TIME ZONE 'America/Costa_Rica' AS opens_at,
           (p_day + make_interval(mins => upper(r))) AT TIME ZONE 'America/Costa_Rica' AS closes_at
      FROM unnest((
        SELECT range_agg(int4range(h.start_min, h.end_min))
          FROM public.scheduling_open_hours(p_resource_id, p_day) h
      )) AS r
  ),
  open_day AS (
    SELECT tstzrange(min(opens_at), max(closes_at)) AS r FROM open_block
  ),
  occupied AS (
    SELECT tstzrange(b.starts_at, b.ends_at) AS r
      FROM public.scheduling_manual_blocks b, open_day d
     WHERE b.resource_id = p_resource_id
       AND tstzrange(b.starts_at, b.ends_at) && d.r
    UNION ALL
    SELECT a.occupied_range
      FROM public.scheduling_appointments a, open_day d
     WHERE a.resource_id = p_resource_id
       AND a.status IN ('pending_approval', 'approved', 'confirmed')
       AND a.occupied_range && d.r
  ),
  rounded AS (
    SELECT tstzrange(
             lower(clipped.r),
             LEAST(
               o.opens_at + make_interval(
                 mins => 30 * ceil(extract(epoch FROM upper(clipped.r) - o.opens_at) / 1800)::int),
               o.closes_at)) AS r
      FROM open_block o
      JOIN occupied busy ON busy.r && tstzrange(o.opens_at, o.closes_at)
      CROSS JOIN LATERAL (SELECT busy.r * tstzrange(o.opens_at, o.closes_at) AS r) clipped
  )
  SELECT lower(merged), upper(merged)
    FROM unnest((SELECT range_agg(r) FROM rounded)) AS merged
   ORDER BY 1
   LIMIT 200;
$$;

-- Solo usuarias autenticadas, como la versión anterior: el calendario vive en el portal.
REVOKE ALL ON FUNCTION public.scheduling_busy_ranges(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_busy_ranges(uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_busy_ranges(uuid, date) TO authenticated;
