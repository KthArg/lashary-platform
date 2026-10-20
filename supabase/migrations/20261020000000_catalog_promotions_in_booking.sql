-- 20261020000000_catalog_promotions_in_booking.sql
-- US-PROM-01 · features catalog y scheduling — la promoción vigente se aplica al reservar.
-- Decisión del líder del proyecto (comunicada por Erick Duran, 2026-10-20, ver DEPENDENCIES.md):
-- solo técnicas por ahora (paquetes queda diferido a US-AGE-04) y la cita debe guardar QUÉ
-- promoción se aplicó, no solo el precio ya rebajado.
-- catalog_booking_terms es el único punto por donde scheduling conoce el precio de una técnica
-- (ARCH-005): aplicar el descuento ahí, dentro de catalog, es lo único que hace falta para que
-- toda la reserva (cotización y confirmación) lo herede sin que scheduling lea catalog_promotions.
-- D-PROM-3: si una técnica tiene más de una promoción vigente a la vez (el esquema no lo impide:
-- catalog_promotions no tiene un constraint de exclusión como las citas), gana la de mayor
-- descuento; un empate lo resuelve la que vence primero. Sin esto, el resultado sería no
-- determinista entre dos corridas con los mismos datos.
-- DOM-001: el descuento se redondea al colón más cercano (round()), nunca fracciones de colón.
-- promotion_id no lleva FK, igual que technique_id en scheduling_appointments: es snapshot, no
-- referencia viva (DOM-002) — una promoción puede pausarse o vencer después sin afectar citas ya
-- agendadas con ese descuento.
-- Cumplimiento: ARCH-005, DOM-001, DOM-002, SEC-001 (RLS de catalog_promotions ya es pública en
--   lectura, igual que catalog_techniques), PERF-005 (filtro de vigencia en la base),
--   INT-008 (una migración, forward-only).

-- 1. catalog_booking_terms (contrato de catalog, 20261018000003) ahora también busca la
--    promoción vigente para esa técnica y, si hay una, descuenta el precio y la identifica.
--    Postgres no deja cambiar las columnas de salida de una función RETURNS TABLE con CREATE OR
--    REPLACE ("Row type defined by OUT parameters is different"): hay que soltarla primero.
DROP FUNCTION IF EXISTS public.catalog_booking_terms(uuid, boolean);
CREATE FUNCTION public.catalog_booking_terms(p_technique_id uuid, p_is_first_time boolean)
RETURNS TABLE (
  technique_id      uuid,
  name              text,
  price             bigint,
  duration_min      integer,
  buffer_min        integer,
  deposit           bigint,
  promotion_id      uuid,
  discount_percent  integer
)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT t.id,
         t.name,
         CASE WHEN promo.discount_percent IS NULL
              THEN CASE WHEN p_is_first_time THEN t.price_first_time ELSE t.price_retouch END
              ELSE round(
                     (CASE WHEN p_is_first_time THEN t.price_first_time ELSE t.price_retouch END)
                     * (100 - promo.discount_percent) / 100.0
                   )::bigint
         END,
         CASE WHEN p_is_first_time THEN t.duration_first_time_min ELSE t.duration_retouch_min END,
         t.buffer_min,
         t.deposit,
         promo.id,
         promo.discount_percent
    FROM public.catalog_techniques t
    LEFT JOIN LATERAL (
      SELECT p.id, p.discount_percent
        FROM public.catalog_promotions p
       WHERE p.technique_id = t.id
         AND p.is_active
         AND p.starts_at <= now()
         AND p.ends_at >= now()
       ORDER BY p.discount_percent DESC, p.ends_at ASC
       LIMIT 1
    ) promo ON true
   WHERE t.id = p_technique_id
     AND t.is_active
     AND (p_is_first_time OR t.price_retouch IS NOT NULL);
$$;

-- DROP + CREATE es un objeto nuevo (OID distinto): los permisos de 20261018000003 no
-- sobreviven, hay que volver a otorgarlos.
REVOKE ALL ON FUNCTION public.catalog_booking_terms(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_booking_terms(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_booking_terms(uuid, boolean) TO authenticated;

-- 2. La cita guarda qué promoción se aplicó, no solo el precio ya rebajado (decisión del líder
--    del proyecto). Ambas columnas o ninguna: una cita no puede tener descuento sin saber de
--    cuál promoción viene.
ALTER TABLE public.scheduling_appointments
  ADD COLUMN promotion_id     uuid,
  ADD COLUMN discount_percent integer CHECK (discount_percent > 0 AND discount_percent <= 100);

ALTER TABLE public.scheduling_appointments
  ADD CONSTRAINT scheduling_appointments_promotion_snapshot_complete CHECK (
    (promotion_id IS NULL) = (discount_percent IS NULL)
  );

-- 3. scheduling_book_appointment (20261019000009, la versión vigente) copia los dos campos
--    nuevos de catalog_booking_terms al confirmar. El resto de la función es idéntico: el cambio
--    real está en la lista de columnas del INSERT.
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
          AND a.occupied_range && tstzrange(p_starts_at, v_occupied_until)
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

REVOKE ALL ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_book_appointment(uuid, timestamptz, uuid, boolean) TO authenticated;

-- 4. scheduling_quote_booking (20261019000009, la versión vigente) muestra el descuento ANTES
--    de confirmar (criterio 2 de US-PROM-01): lo que se cotiza vuelve a ser exactamente lo mismo
--    que luego guarda la reserva (DOM-002), ahora incluida la promoción. Mismo motivo que
--    catalog_booking_terms arriba: RETURNS TABLE con columnas nuevas exige soltarla primero.
DROP FUNCTION IF EXISTS public.scheduling_quote_booking(uuid, boolean);
CREATE FUNCTION public.scheduling_quote_booking(p_technique_id uuid, p_is_first_time boolean)
RETURNS TABLE (
  technique_name    text,
  price             bigint,
  duration_min      integer,
  buffer_min        integer,
  deposit_due       bigint,
  promotion_id      uuid,
  discount_percent  integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
  v_terms     record;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT * INTO v_terms FROM public.catalog_booking_terms(p_technique_id, p_is_first_time);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduling_technique_not_available';
  END IF;

  RETURN QUERY
    SELECT v_terms.name, v_terms.price, v_terms.duration_min, v_terms.buffer_min,
           public.payments_deposit_due(v_client_id, v_terms.deposit),
           v_terms.promotion_id, v_terms.discount_percent;
END;
$$;

-- DROP + CREATE es un objeto nuevo (OID distinto): los permisos de 20261019000002 no
-- sobreviven, hay que volver a otorgarlos.
REVOKE ALL ON FUNCTION public.scheduling_quote_booking(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_quote_booking(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_quote_booking(uuid, boolean) TO authenticated;
