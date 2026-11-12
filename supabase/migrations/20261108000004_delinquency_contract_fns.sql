-- 20261108000004_delinquency_contract_fns.sql
-- US-MOR-01 · feature delinquency — las dos funciones de lectura que `delinquency` ofrece a las demás
-- features (contrato: docs/contracts/delinquency-api.md, ARCH-005, INT-003). Las usa `clients` para
-- la columna de morosidad del listado y el expediente (criterio 5), y el panel para el listado de
-- morosidades activas. Solo lectura.
-- Corren con los permisos de quien llama (SECURITY INVOKER): la RLS de delinquency_cases decide qué se
-- ve, así que solo staff recibe filas; una clienta recibe una lista vacía y anon no tiene EXECUTE.
-- `pending_review` no bloquea (DOM-012): se devuelve con su estado para que quien consuma el contrato
-- solo trate `active` como morosidad. Una `dismissed` no se devuelve.
-- Cumplimiento: ARCH-005, DOM-012, SEC-001, SEC-002, PERF-002, INT-003, INT-008.

CREATE FUNCTION public.delinquency_client_states(p_client_ids uuid[])
RETURNS TABLE (client_id uuid, state text, pending bigint, since timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(cardinality(p_client_ids), 0) > 200 THEN
    RAISE EXCEPTION 'delinquency_too_many_ids' USING ERRCODE = '54000';
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT c.client_id,
           c.state,
           sum(c.pending)::bigint AS pending,
           min(c.detected_at)     AS since,
           row_number() OVER (
             PARTITION BY c.client_id
             ORDER BY CASE c.state WHEN 'active' THEN 0 ELSE 1 END
           ) AS rank
      FROM public.delinquency_cases c
     WHERE c.client_id = ANY (coalesce(p_client_ids, ARRAY[]::uuid[]))
       AND c.state IN ('active', 'pending_review')
     GROUP BY c.client_id, c.state
  )
  SELECT r.client_id, r.state, r.pending, r.since
    FROM ranked r
   WHERE r.rank = 1;
END;
$$;

CREATE FUNCTION public.delinquency_list_active(p_limit integer, p_after timestamptz DEFAULT NULL)
RETURNS TABLE (client_id uuid, pending bigint, since timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.client_id,
         sum(c.pending)::bigint AS pending,
         min(c.detected_at)     AS since
    FROM public.delinquency_cases c
   WHERE c.state = 'active'
   GROUP BY c.client_id
  HAVING p_after IS NULL OR min(c.detected_at) < p_after
   ORDER BY 3 DESC, 1
   LIMIT greatest(1, least(coalesce(p_limit, 100), 100));
$$;

REVOKE ALL ON FUNCTION public.delinquency_client_states(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_client_states(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_client_states(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.delinquency_list_active(integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_list_active(integer, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_list_active(integer, timestamptz) TO authenticated;
