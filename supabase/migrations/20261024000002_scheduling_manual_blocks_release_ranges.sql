-- 20261024000002_scheduling_manual_blocks_release_ranges.sql
-- US-AGE-07 · desbloquear espacios sueltos (criterio 3): resta rangos de los bloqueos manuales que
-- los cubren. Sin UPDATE: borra el bloqueo y reinserta lo que sobra, en una transacción (SEC-001,
-- SEC-002, DOM-010, INT-008).

CREATE FUNCTION public.scheduling_release_manual_ranges(
  p_resource_id uuid,
  p_from timestamptz[],
  p_to timestamptz[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_released tstzmultirange := '{}'::tstzmultirange;
  v_block public.scheduling_manual_blocks%ROWTYPE;
  v_piece tstzrange;
  v_is_first boolean;
  v_index integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || p_resource_id::text, 0));

  IF p_from IS NULL OR p_to IS NULL
     OR coalesce(cardinality(p_from), 0) = 0
     OR cardinality(p_from) <> cardinality(p_to) THEN
    RAISE EXCEPTION 'scheduling_manual_ranges_invalid' USING ERRCODE = '22023';
  END IF;

  FOR v_index IN 1..cardinality(p_from) LOOP
    IF p_from[v_index] IS NULL OR p_to[v_index] IS NULL OR p_from[v_index] >= p_to[v_index] THEN
      RAISE EXCEPTION 'scheduling_manual_ranges_invalid' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
      SELECT 1
        FROM public.scheduling_manual_blocks b
       WHERE b.resource_id = p_resource_id
         AND tstzrange(b.starts_at, b.ends_at) && tstzrange(p_from[v_index], p_to[v_index])
    ) THEN
      RAISE EXCEPTION 'scheduling_manual_block_not_found' USING ERRCODE = 'P0002';
    END IF;

    v_released := v_released + tstzmultirange(tstzrange(p_from[v_index], p_to[v_index]));
  END LOOP;

  FOR v_block IN
    SELECT b.*
      FROM public.scheduling_manual_blocks b
     WHERE b.resource_id = p_resource_id
       AND tstzmultirange(tstzrange(b.starts_at, b.ends_at)) && v_released
     ORDER BY b.starts_at
  LOOP
    DELETE FROM public.scheduling_manual_blocks WHERE id = v_block.id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'scheduling_manual_block_not_found' USING ERRCODE = 'P0002';
    END IF;

    v_is_first := true;
    FOR v_piece IN
      SELECT unnest(tstzmultirange(tstzrange(v_block.starts_at, v_block.ends_at)) - v_released)
    LOOP
      INSERT INTO public.scheduling_manual_blocks (id, resource_id, starts_at, ends_at, reason, created_at)
      VALUES (
        CASE WHEN v_is_first THEN v_block.id ELSE gen_random_uuid() END,
        v_block.resource_id,
        lower(v_piece),
        upper(v_piece),
        v_block.reason,
        CASE WHEN v_is_first THEN v_block.created_at ELSE now() END
      );
      v_is_first := false;
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_release_manual_ranges(uuid, timestamptz[], timestamptz[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_release_manual_ranges(uuid, timestamptz[], timestamptz[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_release_manual_ranges(uuid, timestamptz[], timestamptz[]) TO authenticated;
