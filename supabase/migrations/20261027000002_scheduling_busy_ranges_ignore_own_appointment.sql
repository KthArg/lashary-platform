-- 20261027000002_scheduling_busy_ranges_ignore_own_appointment.sql
-- US-AGE-10 · feature scheduling — el calendario de la clienta que reagenda no debe marcar como
-- ocupado el rango de la cita que está moviendo: una cita ocupa más de un espacio de la grilla, así
-- que sin esto no podría pedir «una hora más tarde» aunque
-- `scheduling_reschedule_appointment` lo acepta (la cita no choca consigo misma).
-- `scheduling_busy_ranges` recibe un tercer parámetro opcional, la cita a ignorar. Solo se ignora si
-- es de la clienta de la sesión (`clients_current_profile_id()`): ignorar la cita de otra persona
-- dejaría ver qué horarios libera. Sin el parámetro, o con una cita ajena o inexistente, la función
-- responde igual que antes. La salida sigue siendo lo ocupado unido, recortado y redondeado a la
-- grilla, sin distinguir citas de bloqueos (SEC-001).
-- Se reemplaza la función (cambia su firma) y se conserva el privilegio solo para `authenticated`.
-- Cumplimiento: SEC-001, SEC-002, SEC-005, PERF-002, INT-008 (una migración, forward-only).

DROP FUNCTION public.scheduling_busy_ranges(uuid, date);

CREATE FUNCTION public.scheduling_busy_ranges(
  p_resource_id            uuid,
  p_day                    date,
  p_ignore_appointment_id  uuid DEFAULT NULL
)
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
       AND NOT (
         p_ignore_appointment_id IS NOT NULL
         AND a.id = p_ignore_appointment_id
         AND a.client_id = public.clients_current_profile_id()
       )
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

REVOKE ALL ON FUNCTION public.scheduling_busy_ranges(uuid, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_busy_ranges(uuid, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_busy_ranges(uuid, date, uuid) TO authenticated;
