-- 20261027000010_scheduling_reductions_see_held_schedule.sql
-- US-AGE-10 · feature scheduling — hallazgo A2: reducir la disponibilidad también respeta el horario que
-- guarda un reagendado (20261027000006). Si la administradora cerrara ese día o quitara ese bloque
-- semanal, rechazar el reagendado devolvería la cita a un horario cerrado.
-- 1. `scheduling_closed_date_rejects_active_appointment` (cerrar un día) y
--    `scheduling_count_appointments_in_range` (el conteo que el panel muestra antes de cerrar un día o
--    bloquear un espacio) miran los dos espacios de cada cita.
-- 2. `scheduling_count_appointments_affected_by_weekly_block` (el conteo del panel y el trigger que impide
--    quitar un bloque semanal con citas) ubica en la semana cada espacio de la cita, no solo el vigente.
-- Una cita cuenta una vez aunque sus dos espacios caigan en lo que se reduce. Cada espacio cuenta solo si
-- todavía no terminó, como antes con la cita entera. Los cuerpos son los de 20261025000003 y
-- 20261019000004 con ese cambio. Mismas firmas: `CREATE OR REPLACE` conserva los permisos.
-- Cumplimiento: DOM-010, SEC-001, INT-008 (una migración, forward-only).

CREATE OR REPLACE FUNCTION public.scheduling_closed_date_rejects_active_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || NEW.resource_id::text, 0));

  IF EXISTS (
    SELECT 1
      FROM public.scheduling_appointments a
     CROSS JOIN LATERAL unnest(a.blocked_ranges) AS held(r)
     WHERE a.resource_id = NEW.resource_id
       AND a.status IN ('pending_approval', 'approved', 'confirmed')
       AND upper(held.r) > now()
       AND held.r && tstzrange(
             NEW.closed_on::timestamp AT TIME ZONE 'America/Costa_Rica',
             (NEW.closed_on + 1)::timestamp AT TIME ZONE 'America/Costa_Rica')
  ) THEN
    RAISE EXCEPTION 'scheduling_closed_dates_active_appointment'
      USING ERRCODE = '23514',
            DETAIL = 'Ese día tiene una cita activa; hay que resolverla antes de cerrarlo.';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.scheduling_count_appointments_in_range(
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
  SELECT count(DISTINCT a.id)::integer
    FROM public.scheduling_appointments a
   CROSS JOIN LATERAL unnest(a.blocked_ranges) AS held(r)
   WHERE a.resource_id = p_resource_id
     AND a.status IN ('pending_approval', 'approved', 'confirmed')
     AND upper(held.r) > now()
     AND held.r && tstzrange(p_from, p_to);
$$;

CREATE OR REPLACE FUNCTION public.scheduling_count_appointments_affected_by_weekly_block(p_block_id uuid)
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
    SELECT a.id,
           int4range(
             (extract(hour FROM s.local_start) * 60 + extract(minute FROM s.local_start))::integer,
             (extract(hour FROM s.local_start) * 60 + extract(minute FROM s.local_start)
                + extract(epoch FROM upper(held.r) - lower(held.r)) / 60)::integer
           ) AS minutes,
           extract(isodow FROM s.local_start)::smallint AS weekday,
           a.resource_id
      FROM public.scheduling_appointments a
     CROSS JOIN LATERAL unnest(a.blocked_ranges) AS held(r)
     CROSS JOIN LATERAL (SELECT lower(held.r) AT TIME ZONE 'America/Costa_Rica' AS local_start) s
     WHERE a.status IN ('pending_approval', 'approved', 'confirmed')
       AND upper(held.r) > now()
  )
  SELECT count(DISTINCT p.id)::integer
    FROM placed p
    JOIN removed r ON r.resource_id = p.resource_id AND r.weekday = p.weekday
   WHERE p.minutes && int4range(r.start_min, r.end_min);
$$;
