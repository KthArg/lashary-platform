-- 20261110000004_scheduling_admin_book_appointment_fn.sql
-- US-MOR-02 · feature scheduling — la administradora agenda en nombre de una clienta y puede autorizar la
-- excepción cuando la clienta está bloqueada por una morosidad (criterio 4 de US-MOR-02; «agendar en nombre
-- de una clienta» es una cláusula de esta historia, ADR-0007). Decisión del 2026-11-11: se entrega la
-- función SQL y no su pantalla.
-- Solo para administradora: cualquier otra sesión recibe `scheduling_not_authorized` (42501). La clienta la
-- da el parámetro `p_client_id` (la reserva de la clienta la saca de su sesión); el resto es el mismo cálculo
-- y las mismas validaciones que `scheduling_book_appointment`, de la que se copia (la cita nace igual:
-- `pending_approval`; el PO, Kenny, lo confirmó el 2026-11-11).
-- La misma regla de morosidad: si la clienta está bloqueada y no hay autorización, devuelve la fila con `id`
-- nulo y registra el bloqueo, igual que cuando agenda ella. Con `p_authorize_exception = true` (la
-- confirmación explícita) se exige un motivo de al menos 10 caracteres (`scheduling_exception_reason_required`,
-- 22023; el mínimo lo confirmó Kenny el 2026-11-11), se agenda, y queda el evento
-- `scheduling.booking.block_exception_authorized` en la misma transacción (DOM-011): actor la administradora,
-- entidad la cita creada, con la clienta, el motivo y las citas que bloqueaban. La clienta no lo ve: la
-- bitácora solo la lee staff. Si la clienta no estaba bloqueada la autorización no hace nada.
-- No asume una sola persona: el bloqueo es por clienta, y la excepción guarda el id de quien la autorizó.
-- Solo reserva una técnica suelta; el paquete no está cubierto (queda para cuando exista su pantalla).
-- Cumplimiento: ARCH-005, ARCH-006, DOM-011, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

CREATE FUNCTION public.scheduling_admin_book_appointment(
  p_client_id            uuid,
  p_resource_id          uuid,
  p_starts_at            timestamptz,
  p_technique_id         uuid,
  p_is_first_time        boolean,
  p_expected_price       bigint DEFAULT NULL,
  p_authorize_exception  boolean DEFAULT false,
  p_exception_reason     text DEFAULT NULL
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
  -- Mínimo de caracteres del motivo de la excepción: 10, confirmado por el PO (Kenny, 2026-11-11).
  c_min_reason_length CONSTANT integer := 10;

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
  v_blocks         jsonb;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'scheduling_not_authorized' USING ERRCODE = '42501';
  END IF;

  -- La clienta es la que dice el parámetro, no la sesión: aquí agenda la administradora por ella.
  v_client_id := p_client_id;
  -- Que la clienta exista se pregunta al contrato de clients (ARCH-005): scheduling no lee las tablas de esa feature.
  IF v_client_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.clients_display_names(ARRAY[v_client_id])) THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  -- La misma regla de morosidad que rige a la clienta (criterio 4 de US-MOR-02). Sin autorización, el
  -- bloqueo se registra y devuelve NULL, igual que cuando agenda la clienta. Con autorización explícita se
  -- exige un motivo y se agenda; el evento de la excepción se deja al final, con la cita creada. Si la
  -- clienta no está bloqueada, la autorización no hace nada: no se pide motivo ni se deja evento.
  SELECT jsonb_agg(
           jsonb_build_object('appointmentId', b.appointment_id, 'pending', b.pending)
           ORDER BY b.since, b.appointment_id
         )
    INTO v_blocks
    FROM public.delinquency_booking_block(v_client_id) b;

  IF v_blocks IS NOT NULL THEN
    IF NOT coalesce(p_authorize_exception, false) THEN
      IF public.scheduling_booking_blocked_by_delinquency(v_client_id, p_resource_id, p_starts_at, p_technique_id) THEN
        RETURN NULL;
      END IF;
    ELSIF length(btrim(coalesce(p_exception_reason, ''))) < c_min_reason_length THEN
      RAISE EXCEPTION 'scheduling_exception_reason_required' USING ERRCODE = '22023';
    END IF;
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

  -- Llegar aquí con bloqueos y sin haber devuelto NULL antes significa que la excepción se autorizó y se usó.
  IF v_blocks IS NOT NULL THEN
    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.booking.block_exception_authorized',
      'scheduling_appointment',
      v_created.id,
      jsonb_build_object(
        'clientId',             v_client_id,
        'reason',               btrim(p_exception_reason),
        'blockingAppointments', v_blocks
      )
    );
  END IF;

  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_admin_book_appointment(uuid, uuid, timestamptz, uuid, boolean, bigint, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_admin_book_appointment(uuid, uuid, timestamptz, uuid, boolean, bigint, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_admin_book_appointment(uuid, uuid, timestamptz, uuid, boolean, bigint, boolean, text) TO authenticated;
