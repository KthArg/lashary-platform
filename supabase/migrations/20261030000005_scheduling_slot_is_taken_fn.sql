-- 20261030000005_scheduling_slot_is_taken_fn.sql
-- US-AGE-04 · feature scheduling — extrae la comprobación de "¿este espacio ya está ocupado?" a su
-- propia función, hallazgo de code review: scheduling_book_package_appointment
-- (20261030000002) copió esa comprobación de scheduling_book_appointment en vez de compartirla, y
-- US-AGE-10 (rama feat/us-age-10-calendario-ve-horario-guardado, todavía sin mergear a main) ya
-- cambió la original para mirar blocked_ranges (el horario guardado de un reagendado sigue
-- ocupado) en vez de occupied_range — sin este cambio, las dos copias se iban a desfasar apenas
-- una de las dos historias mergeara antes que la otra.
-- scheduling_slot_is_taken(p_resource_id, p_starts_at, p_occupied_until) reproduce exactamente el
-- criterio vigente hoy en main (occupied_range + scheduling_manual_blocks); solo
-- scheduling_book_package_appointment la usa en esta migración porque scheduling_book_appointment
-- lo sigue editando US-AGE-10 en su propia rama, y tocarla aquí competiría por las mismas líneas.
-- Queda anotado en docs/process/DEPENDENCIES.md: quien de las dos historias entre segundo a main
-- debe dejar scheduling_book_appointment llamando también a esta función (en vez de su copia
-- inline) y, si ya existe blocked_ranges, moverla a esa columna aquí mismo — un solo lugar para
-- las dos reservas en vez de dos copias que hay que acordarse de sincronizar a mano.
-- Sin GRANT a anon/authenticated (igual que scheduling_evaluate_cancellation,
-- 20261022000000_scheduling_cancellation_uses_registered_deposit.sql): solo la llama otra función
-- SECURITY DEFINER, que corre como su propietaria.
-- Cumplimiento: ARCH-005, DOM-010, SEC-001, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_slot_is_taken(
  p_resource_id      uuid,
  p_starts_at        timestamptz,
  p_occupied_until   timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
       SELECT 1 FROM public.scheduling_appointments a
        WHERE a.resource_id = p_resource_id
          AND a.status IN ('pending_approval', 'approved', 'confirmed')
          AND a.occupied_range && tstzrange(p_starts_at, p_occupied_until)
     )
     OR EXISTS (
       SELECT 1 FROM public.scheduling_manual_blocks b
        WHERE b.resource_id = p_resource_id
          AND tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, p_occupied_until)
     );
$$;

REVOKE ALL ON FUNCTION public.scheduling_slot_is_taken(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_slot_is_taken(uuid, timestamptz, timestamptz) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.scheduling_book_package_appointment(
  p_resource_id uuid,
  p_starts_at   timestamptz,
  p_package_id  uuid
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

  v_client_id         uuid;
  v_pending_count     bigint;
  v_technique_count   bigint;
  v_package_name      text;
  v_package_price     bigint;
  v_deposit           bigint;
  v_duration_min      bigint;
  v_buffer_min        bigint;
  v_technique_ids     uuid[];
  v_technique_names   text[];
  v_technique_durations integer[];
  v_technique_buffers   integer[];
  v_ends_at           timestamptz;
  v_occupied_until    timestamptz;
  v_local_start       timestamp;
  v_day               date;
  v_start_min         integer;
  v_end_min           integer;
  v_block_start       integer;
  v_created           public.scheduling_appointments;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT count(*), max(package_name), max(package_price), max(deposit),
         sum(duration_min), sum(buffer_min),
         array_agg(technique_id), array_agg(technique_name),
         array_agg(duration_min), array_agg(buffer_min)
    INTO v_technique_count, v_package_name, v_package_price, v_deposit,
         v_duration_min, v_buffer_min,
         v_technique_ids, v_technique_names, v_technique_durations, v_technique_buffers
    FROM public.catalog_package_booking_terms(p_package_id);

  IF v_technique_count = 0 THEN
    RAISE EXCEPTION 'scheduling_package_not_available';
  END IF;

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

  v_ends_at        := p_starts_at + make_interval(mins => v_duration_min::integer);
  v_occupied_until := v_ends_at + make_interval(mins => v_buffer_min::integer);

  v_local_start := p_starts_at AT TIME ZONE c_studio_zone;
  v_day         := v_local_start::date;
  v_start_min   := extract(hour FROM v_local_start)::integer * 60 + extract(minute FROM v_local_start)::integer;
  v_end_min     := v_start_min + v_duration_min::integer + v_buffer_min::integer;

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

  IF public.scheduling_slot_is_taken(p_resource_id, p_starts_at, v_occupied_until) THEN
    RAISE EXCEPTION 'scheduling_slot_taken';
  END IF;

  BEGIN
    INSERT INTO public.scheduling_appointments (
      resource_id, starts_at, ends_at, occupied_range,
      client_id, package_id, package_name,
      service_price, deposit_required
    )
    VALUES (
      p_resource_id, p_starts_at, v_ends_at, tstzrange(p_starts_at, v_occupied_until),
      v_client_id, p_package_id, v_package_name,
      v_package_price, public.payments_deposit_due(v_client_id, v_deposit)
    )
    RETURNING * INTO v_created;
  EXCEPTION WHEN exclusion_violation THEN
    INSERT INTO public.scheduling_alerts (kind, resource_id, client_id, requested_from, requested_until)
    VALUES ('appointment_overlap_rejected', p_resource_id, v_client_id, p_starts_at, v_occupied_until);
    RETURN NULL;
  END;

  INSERT INTO public.scheduling_appointment_package_techniques (
    appointment_id, technique_id, technique_name, duration_min, buffer_min
  )
  SELECT v_created.id, t.technique_id, t.technique_name, t.duration_min, t.buffer_min
    FROM unnest(v_technique_ids, v_technique_names, v_technique_durations, v_technique_buffers)
         AS t(technique_id, technique_name, duration_min, buffer_min);

  RETURN v_created;
END;
$$;
