-- 20261108000007_delinquency_list_active_cursor.sql
-- US-MOR-01 · feature delinquency — corrección de la revisión: el listado de morosidades activas
-- pagina por el par (since, client_id), no solo por `since`.
-- Con un cursor solo por fecha, `since < p_after` se salta a todas las clientas que empatan con la
-- última de la página, y las morosidades que genera una misma corrida de detección comparten la
-- misma marca de tiempo (todas usan el mismo now()). Con el par, la página siguiente empieza justo
-- después de la última fila: las que empatan en fecha se ordenan por clienta y ninguna se pierde,
-- igual que `payments_unpaid_charges` (migración 20261108000000).
-- Cambia la firma, así que reemplaza la función de la migración 20261108000004 (todavía no está en
-- main; la usa solo `delinquency`). Sigue siendo SECURITY INVOKER: la RLS decide qué se ve.
-- Cumplimiento: ARCH-005, SEC-001, SEC-002, PERF-002, INT-003, INT-008.

DROP FUNCTION public.delinquency_list_active(integer, timestamptz);

CREATE FUNCTION public.delinquency_list_active(
  p_limit            integer,
  p_after_since      timestamptz DEFAULT NULL,
  p_after_client_id  uuid DEFAULT NULL
)
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
  HAVING p_after_since IS NULL
      OR min(c.detected_at) < p_after_since
      OR (
        min(c.detected_at) = p_after_since
        AND c.client_id > coalesce(p_after_client_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
   ORDER BY 3 DESC, 1
   LIMIT greatest(1, least(coalesce(p_limit, 100), 100));
$$;

REVOKE ALL ON FUNCTION public.delinquency_list_active(integer, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_list_active(integer, timestamptz, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_list_active(integer, timestamptz, uuid) TO authenticated;
