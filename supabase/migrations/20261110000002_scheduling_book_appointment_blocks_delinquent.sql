-- 20261110000002_scheduling_book_appointment_blocks_delinquent.sql
-- US-MOR-02 · feature scheduling — la reserva de una técnica rechaza a la clienta con una morosidad
-- confirmada que todavía debe (criterios 1 y 5 de US-MOR-02; ítem 7 de «Criterios trasladados»,
-- trasladado desde US-AGE-05). El bloqueo vive en la base y no solo en la pantalla: la clienta llama a esta
-- función directo por PostgREST, y un chequeo solo en TypeScript se lo saltaría (SEC-001).
-- `scheduling` no lee tablas de `delinquency` (ARCH-005): le pregunta a su función del contrato,
-- `delinquency_booking_block`, que ya devuelve solo las `active` cuya cita todavía debe, con el saldo de hoy.
-- Un bloqueo se registra sin lanzar una excepción: una excepción revertiría la transacción y se llevaría el
-- registro, como ya resolvió el solape con `scheduling_alerts`. La función devuelve la fila con `id` nulo
-- (el mismo camino del solape) y deja el evento `scheduling.booking.blocked_by_delinquency` en la bitácora
-- en la misma transacción (DOM-011); la aplicación distingue el bloqueo del solape preguntando otra vez a
-- `delinquency_booking_block` y arma el mensaje con el monto y la cita. Se revisa antes que el solape.
-- El registro lo escribe una función auxiliar SECURITY DEFINER sin EXECUTE para nadie: solo la llaman las
-- funciones de reserva, así que una clienta no puede falsear eventos llamándola aparte. La bitácora acepta
-- la escritura porque la hace el dueño; el actor es la sesión que intentó agendar.
-- La función conserva su firma, así que CREATE OR REPLACE mantiene sus permisos.
-- Cumplimiento: ARCH-005, ARCH-006, DOM-011, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

CREATE FUNCTION public.scheduling_booking_blocked_by_delinquency(
  p_client_id   uuid,
  p_resource_id uuid,
  p_starts_at   timestamptz,
  p_service_id  uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_blocks jsonb;
BEGIN
  SELECT jsonb_agg(
           jsonb_build_object('appointmentId', b.appointment_id, 'pending', b.pending)
           ORDER BY b.since, b.appointment_id
         )
    INTO v_blocks
    FROM public.delinquency_booking_block(p_client_id) b;

  IF v_blocks IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'scheduling.booking.blocked_by_delinquency',
    'client',
    p_client_id,
    jsonb_build_object(
      'blockingAppointments', v_blocks,
      'resourceId',           p_resource_id,
      'startsAt',             p_starts_at,
      'serviceId',            p_service_id
    )
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_booking_blocked_by_delinquency(uuid, uuid, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_booking_blocked_by_delinquency(uuid, uuid, timestamptz, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.scheduling_booking_blocked_by_delinquency(uuid, uuid, timestamptz, uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.scheduling_book_appointment(
  p_resource_id     uuid,
  p_starts_at       timestamptz,
  p_technique_id    uuid,
  p_is_first_time   boolean,
  p_expected_price  bigint DEFAULT NULL
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

  -- US-MOR-02: una clienta con una morosidad confirmada que todavía debe no puede agendar. Se revisa
  -- antes que el solape, así que si ocurren las dos gana el bloqueo. El rechazo devuelve NULL y deja el
  -- evento en la bitácora: lanzar una excepción lo desharía junto con el rechazo.
  IF public.scheduling_booking_blocked_by_delinquency(v_client_id, p_resource_id, p_starts_at, p_technique_id) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_terms FROM public.catalog_booking_terms(p_technique_id, p_is_first_time);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_technique_not_available';
  END IF;

  IF p_expected_price IS NOT NULL AND v_terms.price IS DISTINCT FROM p_expected_price THEN
    RAISE EXCEPTION 'scheduling_price_changed';
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
      service_price, deposit_required, promotion_id, discount_percent
    )
    VALUES (
      p_resource_id, p_starts_at, v_ends_at, tstzrange(p_starts_at, v_occupied_until),
      v_client_id, v_terms.technique_id, v_terms.name, p_is_first_time, v_detected_first_time,
      v_terms.price, public.payments_deposit_due(v_client_id, v_terms.deposit),
      v_terms.promotion_id, v_terms.discount_percent
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
