-- 20261027000009_scheduling_calendar_and_blocks_see_held_schedule.sql
-- US-AGE-10 · feature scheduling — hallazgo A2: el horario que guarda un reagendado (20261027000006)
-- sigue ocupado, así que todo lo que pregunta si un espacio está libre lo mira, no solo el constraint.
-- 1. `scheduling_busy_ranges`: el calendario de la clienta muestra ocupados los dos espacios de cada cita
--    (`blocked_ranges`). La cita propia que se reagenda se sigue ignorando entera: la clienta puede volver
--    a su horario guardado, y la función de reagendar lo acepta.
-- 2. `scheduling_manual_block_rejects_active_appointment`: la administradora no puede bloquear el horario
--    guardado de una cita, como no puede bloquear el vigente. Si lo bloqueara, rechazar el reagendado
--    devolvería la cita a un espacio bloqueado.
-- 3. `scheduling_book_appointment`: la comprobación previa mira los dos espacios. Sin esto, reservar sobre
--    un horario guardado pasaba la comprobación, chocaba con el constraint y quedaba como un choque de
--    concurrencia (sin cita y con una alerta `appointment_overlap_rejected` para la administradora), en
--    vez de responder `scheduling_slot_taken`.
-- Los cuerpos son los de 20261027000002, 20261025000000 y 20261019000009, con solo ese cambio. Mismas
-- firmas: `CREATE OR REPLACE` conserva los permisos.
-- Cumplimiento: DOM-010, SEC-001, INT-008 (una migración, forward-only).

CREATE OR REPLACE FUNCTION public.scheduling_busy_ranges(
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
    SELECT held.r
      FROM public.scheduling_appointments a
     CROSS JOIN LATERAL unnest(a.blocked_ranges) AS held(r)
     CROSS JOIN open_day d
     WHERE a.resource_id = p_resource_id
       AND a.status IN ('pending_approval', 'approved', 'confirmed')
       AND held.r && d.r
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

CREATE OR REPLACE FUNCTION public.scheduling_manual_block_rejects_active_appointment()
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
     WHERE a.resource_id = NEW.resource_id
       AND a.status IN ('pending_approval', 'approved', 'confirmed')
       AND a.blocked_ranges && tstzrange(NEW.starts_at, NEW.ends_at)
  ) THEN
    -- El mensaje es estable: el repositorio lo reconoce para dar un error tipado.
    RAISE EXCEPTION 'scheduling_manual_blocks_active_appointment'
      USING ERRCODE = '23514',
            DETAIL = 'El espacio tiene una cita activa; hay que resolverla antes de bloquearlo.';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.scheduling_book_appointment(
  p_resource_id   uuid,
  p_starts_at     timestamptz,
  p_technique_id  uuid,
  p_is_first_time boolean
)
RETURNS public.scheduling_appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_studio_zone       CONSTANT text    := 'America/Costa_Rica';
  c_slot_interval_min CONSTANT integer := 30;
  c_minutes_per_day   CONSTANT integer := 1440;

  v_client_id      uuid;
  v_detected_first_time boolean;
  v_pending_count  bigint;
  v_terms          record;
  v_ends_at        timestamptz;
  v_occupied_until timestamptz;
  v_local_start    timestamp;
  v_day            date;
  v_start_min      integer;
  v_end_min        integer;
  v_block_start    integer;
  v_created        public.scheduling_appointments;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT * INTO v_terms FROM public.catalog_booking_terms(p_technique_id, p_is_first_time);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_technique_not_available';
  END IF;

  v_detected_first_time := NOT EXISTS (
    SELECT 1 FROM public.scheduling_appointments h
     WHERE h.client_id = v_client_id
       AND h.technique_id = p_technique_id
       AND h.status = 'completed'
  );

  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_client:' || v_client_id::text, 0));

  SELECT count(*) INTO v_pending_count
    FROM public.scheduling_appointments pending
   WHERE pending.client_id = v_client_id
     AND pending.status = 'pending_approval'
     AND pending.starts_at > now();

  IF v_pending_count >= (SELECT limits.max_pending_per_client FROM public.scheduling_booking_limits limits) THEN
    RAISE EXCEPTION 'scheduling_too_many_pending';
  END IF;

  IF p_starts_at IS NULL OR p_resource_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  v_ends_at        := p_starts_at + make_interval(mins => v_terms.duration_min);
  v_occupied_until := v_ends_at + make_interval(mins => v_terms.buffer_min);

  v_local_start := p_starts_at AT TIME ZONE c_studio_zone;
  v_day         := v_local_start::date;
  v_start_min   := extract(hour FROM v_local_start)::integer * 60 + extract(minute FROM v_local_start)::integer;
  v_end_min     := v_start_min + v_terms.duration_min + v_terms.buffer_min;

  IF p_starts_at <= now()
     OR date_trunc('minute', v_local_start) <> v_local_start
     OR v_end_min > c_minutes_per_day
     OR NOT EXISTS (SELECT 1 FROM public.scheduling_resources r WHERE r.id = p_resource_id AND r.is_active)
  THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  SELECT lower(open_block) INTO v_block_start
    FROM unnest((
      SELECT range_agg(int4range(w.start_min, w.end_min))
        FROM public.scheduling_weekly_availability w
       WHERE w.resource_id = p_resource_id
         AND w.weekday = extract(isodow FROM v_day)::smallint
         AND NOT EXISTS (
           SELECT 1 FROM public.scheduling_closed_dates cd
            WHERE cd.resource_id = p_resource_id AND cd.closed_on = v_day
         )
    )) AS open_block
   WHERE open_block @> int4range(v_start_min, v_end_min);

  IF NOT FOUND OR (v_start_min - v_block_start) % c_slot_interval_min <> 0 THEN
    RAISE EXCEPTION 'scheduling_slot_not_offered';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || p_resource_id::text, 0));

  IF EXISTS (
       SELECT 1 FROM public.scheduling_appointments a
        WHERE a.resource_id = p_resource_id
          AND a.status IN ('pending_approval', 'approved', 'confirmed')
          AND a.blocked_ranges && tstzrange(p_starts_at, v_occupied_until)
     )
     OR EXISTS (
       SELECT 1 FROM public.scheduling_manual_blocks b
        WHERE b.resource_id = p_resource_id
          AND tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, v_occupied_until)
     )
  THEN
    RAISE EXCEPTION 'scheduling_slot_taken';
  END IF;

  BEGIN
    INSERT INTO public.scheduling_appointments (
      resource_id, starts_at, ends_at, occupied_range,
      client_id, technique_id, technique_name, is_first_time, is_first_time_detected,
      service_price, deposit_required
    )
    VALUES (
      p_resource_id, p_starts_at, v_ends_at, tstzrange(p_starts_at, v_occupied_until),
      v_client_id, v_terms.technique_id, v_terms.name, p_is_first_time, v_detected_first_time,
      v_terms.price, public.payments_deposit_due(v_client_id, v_terms.deposit)
    )
    RETURNING * INTO v_created;
  EXCEPTION WHEN exclusion_violation THEN
    INSERT INTO public.scheduling_alerts (kind, resource_id, client_id, requested_from, requested_until)
    VALUES ('appointment_overlap_rejected', p_resource_id, v_client_id, p_starts_at, v_occupied_until);
    RETURN NULL;
  END;

  RETURN v_created;
END;
$$;
