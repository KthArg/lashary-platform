-- 20261101000004_catalog_promotions_in_package_booking.sql
-- US-PROM-01 · features catalog y scheduling — la promoción vigente también se aplica al
-- reservar un paquete, no solo una técnica suelta (pieza 13/13 de esta historia).
-- Decisión del líder del proyecto (2026-10-20, ver DEPENDENCIES.md): US-PROM-01 cerró primero
-- solo técnicas porque reservar un paquete (US-AGE-04) no existía todavía. US-AGE-04 ya está en
-- main (catalog_package_booking_terms, scheduling_book_package_appointment,
-- scheduling_quote_package_booking) y su propio SPEC dejó la nota pendiente: "US-PROM-01, cuando
-- exista, deberá congelar el precio con promoción también en scheduling_book_package_appointment
-- /scheduling_quote_package_booking, igual que lo hará en la reserva de técnica suelta de
-- US-AGE-05" (docs/process/DEPENDENCIES.md). Esta migración cierra esa nota.
-- Mismo patrón que 20261026000002_catalog_promotions_in_booking.sql: catalog_package_booking_terms
-- es el único punto por donde scheduling conoce el precio de un paquete (ARCH-005); ahí se busca
-- la promoción vigente, filtrada por package_id en vez de technique_id, con el mismo criterio de
-- "mayor descuento gana" (D-PROM-3) para dos promociones vigentes a la vez sobre el mismo paquete.
-- catalog_package_booking_terms devuelve una fila por técnica incluida con package_price repetido
-- (ver 20261030000000): promotion_id/discount_percent se repiten igual, y las funciones que
-- agregan con max(package_price) agregan también max(discount_percent) y, para promotion_id
-- (uuid), max(promotion_id::text)::uuid — Postgres no trae max()/min() agregado para uuid (hallazgo
-- al escribir las pruebas pgTAP de esta pieza: las 10 clientas de package-booking-concurrency.
-- integration.test.ts fallaban todas con 42883 en vez de que gane una).
-- scheduling_appointments.promotion_id/discount_percent ya existen (snapshot genérico, sin FK,
-- 20261026000002): se reusan tal cual para paquetes, no hacen falta columnas nuevas.
-- scheduling_book_package_appointment quedó al día con dos migraciones posteriores a su versión
-- original (20261030000005 y 20261101000001): la comprobación de espacio ocupado vive ahora en
-- scheduling_slot_is_taken(), no inline — este CREATE OR REPLACE la llama en vez de duplicarla,
-- para no revertir ese refactor. El equivalente de técnica suelta tuvo el mismo problema con
-- scheduling_book_appointment, resuelto en la pieza 10 renombrando su propia migración para que
-- quede después de la de main que lo pisaba (auditoría A3) — no hace falta repetirlo acá porque
-- esta migración, al ser nueva (no una edición de una migración ya mergeada), ya nace con fecha
-- posterior.
-- Postgres no deja cambiar las columnas de salida de una función RETURNS TABLE con CREATE OR
-- REPLACE ("Row type defined by OUT parameters is different"): catalog_package_booking_terms y
-- scheduling_quote_package_booking necesitan DROP FUNCTION antes de CREATE FUNCTION, y sus
-- permisos (REVOKE de anon/PUBLIC, GRANT a authenticated) hay que volver a otorgarlos porque el
-- DROP + CREATE es un objeto nuevo (OID distinto). scheduling_book_package_appointment no, porque
-- devuelve public.scheduling_appointments por referencia, no columnas inline.
-- C3 (decisión del PO, 2026-11-02 — el anticipo nunca supera el precio, mismo criterio que la
-- técnica suelta en la pieza 10): catalog_package_booking_terms devuelve deposit =
-- LEAST(deposit del paquete, precio ya descontado).
-- C4 (decisión del PO, 2026-11-02 — avisar o bloquear, nunca cobrar el precio nuevo en silencio,
-- mismo criterio que la pieza 10): scheduling_book_package_appointment recibe un cuarto parámetro
-- opcional p_expected_price (DEFAULT NULL). Si no coincide con el precio que
-- catalog_package_booking_terms calcula en ese instante, lanza scheduling_price_changed antes de
-- tomar ningún lock. CREATE OR REPLACE con una lista de parámetros distinta crea un overload en
-- vez de remplazar la función (mismo riesgo de ambigüedad 42725 que en la pieza 10): se agrega un
-- DROP FUNCTION IF EXISTS de la firma de 3 argumentos antes de crear la de 4.
-- Cumplimiento: ARCH-005, DOM-001, DOM-002, SEC-001, PERF-005, INT-008 (una migración,
-- forward-only).

-- 1. catalog_package_booking_terms ahora también busca la promoción vigente para ese paquete.
DROP FUNCTION IF EXISTS public.catalog_package_booking_terms(uuid);
CREATE FUNCTION public.catalog_package_booking_terms(p_package_id uuid)
RETURNS TABLE (
  package_id        uuid,
  package_name      text,
  package_price     bigint,
  deposit           bigint,
  technique_id      uuid,
  technique_name    text,
  duration_min      integer,
  buffer_min        integer,
  promotion_id      uuid,
  discount_percent  integer
)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT p.id,
         p.name,
         CASE WHEN promo.discount_percent IS NULL
              THEN p.price
              ELSE round(p.price * (100 - promo.discount_percent) / 100.0)::bigint
         END,
         LEAST(
           p.deposit,
           CASE WHEN promo.discount_percent IS NULL
                THEN p.price
                ELSE round(p.price * (100 - promo.discount_percent) / 100.0)::bigint
           END
         ),
         t.id,
         t.name,
         t.duration_first_time_min,
         t.buffer_min,
         promo.id,
         promo.discount_percent
    FROM public.catalog_packages p
    JOIN public.catalog_package_techniques pt ON pt.package_id = p.id
    JOIN public.catalog_techniques t ON t.id = pt.technique_id
    LEFT JOIN LATERAL (
      SELECT pr.id, pr.discount_percent
        FROM public.catalog_promotions pr
       WHERE pr.package_id = p.id
         AND pr.is_active
         AND pr.starts_at <= now()
         AND pr.ends_at >= now()
       ORDER BY pr.discount_percent DESC, pr.ends_at ASC
       LIMIT 1
    ) promo ON true
   WHERE p.id = p_package_id
     AND p.is_active
   ORDER BY t.id;
$$;

REVOKE ALL ON FUNCTION public.catalog_package_booking_terms(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_package_booking_terms(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_package_booking_terms(uuid) TO authenticated;

-- 2. scheduling_book_package_appointment (20261030000002, la versión vigente) copia los dos
--    campos nuevos al confirmar y recibe p_expected_price (C4). Un cuarto parámetro es una firma
--    distinta: DROP la de 3 argumentos antes de crear la de 4 (mismo riesgo de overload que en la
--    pieza 10).
DROP FUNCTION IF EXISTS public.scheduling_book_package_appointment(uuid, timestamptz, uuid);
CREATE FUNCTION public.scheduling_book_package_appointment(
  p_resource_id     uuid,
  p_starts_at       timestamptz,
  p_package_id      uuid,
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

  v_client_id           uuid;
  v_pending_count       bigint;
  v_technique_count     bigint;
  v_package_name        text;
  v_package_price       bigint;
  v_deposit             bigint;
  v_duration_min        bigint;
  v_buffer_min          bigint;
  v_promotion_id        uuid;
  v_discount_percent    integer;
  v_technique_ids       uuid[];
  v_technique_names     text[];
  v_technique_durations integer[];
  v_technique_buffers   integer[];
  v_ends_at             timestamptz;
  v_occupied_until      timestamptz;
  v_local_start         timestamp;
  v_day                 date;
  v_start_min           integer;
  v_end_min             integer;
  v_block_start         integer;
  v_created             public.scheduling_appointments;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT count(*), max(package_name), max(package_price), max(deposit),
         sum(duration_min), sum(buffer_min), max(promotion_id::text)::uuid, max(discount_percent),
         array_agg(technique_id), array_agg(technique_name),
         array_agg(duration_min), array_agg(buffer_min)
    INTO v_technique_count, v_package_name, v_package_price, v_deposit,
         v_duration_min, v_buffer_min, v_promotion_id, v_discount_percent,
         v_technique_ids, v_technique_names, v_technique_durations, v_technique_buffers
    FROM public.catalog_package_booking_terms(p_package_id);

  IF v_technique_count = 0 THEN
    RAISE EXCEPTION 'scheduling_package_not_available';
  END IF;

  IF p_expected_price IS NOT NULL AND v_package_price IS DISTINCT FROM p_expected_price THEN
    RAISE EXCEPTION 'scheduling_price_changed';
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
      service_price, deposit_required, promotion_id, discount_percent
    )
    VALUES (
      p_resource_id, p_starts_at, v_ends_at, tstzrange(p_starts_at, v_occupied_until),
      v_client_id, p_package_id, v_package_name,
      v_package_price, public.payments_deposit_due(v_client_id, v_deposit),
      v_promotion_id, v_discount_percent
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

REVOKE ALL ON FUNCTION public.scheduling_book_package_appointment(uuid, timestamptz, uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_book_package_appointment(uuid, timestamptz, uuid, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_book_package_appointment(uuid, timestamptz, uuid, bigint) TO authenticated;

-- 3. scheduling_quote_package_booking (20261030000003, la versión vigente) muestra el descuento
--    antes de confirmar, igual que scheduling_quote_booking para una técnica suelta. RETURNS
--    TABLE con columnas nuevas: necesita DROP antes de CREATE, como catalog_package_booking_terms.
DROP FUNCTION IF EXISTS public.scheduling_quote_package_booking(uuid);
CREATE FUNCTION public.scheduling_quote_package_booking(p_package_id uuid)
RETURNS TABLE (
  package_name      text,
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
  v_client_id         uuid;
  v_technique_count   bigint;
  v_package_name      text;
  v_package_price     bigint;
  v_deposit           bigint;
  v_duration_min      bigint;
  v_buffer_min        bigint;
  v_promotion_id      uuid;
  v_discount_percent  integer;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'scheduling_client_not_registered';
  END IF;

  SELECT count(*), max(t.package_name), max(t.package_price), max(t.deposit),
         sum(t.duration_min), sum(t.buffer_min), max(t.promotion_id::text)::uuid, max(t.discount_percent)
    INTO v_technique_count, v_package_name, v_package_price, v_deposit,
         v_duration_min, v_buffer_min, v_promotion_id, v_discount_percent
    FROM public.catalog_package_booking_terms(p_package_id) AS t;

  IF v_technique_count = 0 THEN
    RAISE EXCEPTION 'scheduling_package_not_available';
  END IF;

  RETURN QUERY
    SELECT v_package_name, v_package_price, v_duration_min::integer, v_buffer_min::integer,
           public.payments_deposit_due(v_client_id, v_deposit),
           v_promotion_id, v_discount_percent;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_quote_package_booking(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_quote_package_booking(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_quote_package_booking(uuid) TO authenticated;
