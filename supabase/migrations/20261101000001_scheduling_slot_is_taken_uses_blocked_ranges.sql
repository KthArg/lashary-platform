-- 20261101000001_scheduling_slot_is_taken_uses_blocked_ranges.sql
-- Renombrada desde 20261031000001 (sin mergear a main, reauditoría, hallazgo N1): esa fecha choca
-- con 20261031000001_scheduling_close_appointment_fn.sql de US-AGE-12. Mismo contenido, solo la fecha.
-- US-AGE-04 · feature scheduling — cierra la coordinación con US-AGE-10 que quedó pendiente en
-- docs/process/DEPENDENCIES.md (registro del 2026-10-30, actualizado el 2026-10-31):
-- scheduling_slot_is_taken (20261030000005, usada hoy solo por scheduling_book_package_appointment)
-- miraba occupied_range, el criterio vigente cuando se escribió. US-AGE-10 mergeó primero a main
-- (#632) y dejó blocked_ranges (tstzmultirange GENERATED, 20261027000006: el rango vigente más el
-- horario anterior de un reagendado, si lo hay) como el criterio real de "¿este espacio está
-- ocupado?" — scheduling_book_appointment ya la usa (20261027000009). Entrar segundo a main le
-- toca a US-AGE-04 terminar la unificación: scheduling_slot_is_taken pasa a blocked_ranges, y
-- scheduling_book_appointment llama ahora a esa función compartida en vez de su copia inline — un
-- solo lugar para las dos reservas, cerrando el riesgo de desfase que señaló el code review.
-- Sin este cambio, reagendar una cita de paquete (si US-AGE-10 llega a admitir paquetes en el
-- futuro) no bloquearía su horario anterior; hoy el riesgo es solo de mantenimiento, no de datos.
-- Mismas firmas en las dos funciones: CREATE OR REPLACE conserva los permisos existentes.
-- Cumplimiento: ARCH-005, DOM-010, SEC-001, INT-008 (una migración, forward-only).

CREATE OR REPLACE FUNCTION public.scheduling_slot_is_taken(
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
          AND a.blocked_ranges && tstzrange(p_starts_at, p_occupied_until)
     )
     OR EXISTS (
       SELECT 1 FROM public.scheduling_manual_blocks b
        WHERE b.resource_id = p_resource_id
          AND tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, p_occupied_until)
     );
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

  IF public.scheduling_slot_is_taken(p_resource_id, p_starts_at, v_occupied_until) THEN
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
