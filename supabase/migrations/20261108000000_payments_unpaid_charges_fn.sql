-- 20261108000000_payments_unpaid_charges_fn.sql
-- US-MOR-01 · feature payments — lectura de las citas cerradas con saldo pendiente, para que
-- `delinquency` detecte pagos sin registrar (contrato: docs/contracts/payments-api.md, ARCH-005,
-- INT-003). Solo lectura: no escribe el ledger (DOM-005).
-- Corre con los permisos de quien llama (SECURITY INVOKER): la RLS del ledger decide qué se ve, así
-- que solo staff recibe filas; una clienta recibe una lista vacía y anon no tiene EXECUTE.
-- La función no sabe de gracia ni de morosidad: responde qué citas cerradas siguen sin pagarse al
-- corte que le pasen. Lo demás es de `delinquency`.
-- Cumplimiento: ARCH-005, DOM-005, SEC-001, SEC-002, PERF-002, INT-003, INT-008.

-- Pagina por cursor, no por posición: `p_after_closed_at` y `p_after_appointment_id` son el cierre y la
-- cita de la última fila de la página anterior, y la siguiente página empieza después de ellos. Sin
-- cursor, una lista que crece al inicio (por ejemplo morosidades descartadas, que siguen impagas)
-- dejaría fuera para siempre a las citas nuevas cuando pasen del tope.
CREATE FUNCTION public.payments_unpaid_charges(
  p_closed_before        timestamptz,
  p_limit                integer,
  p_after_closed_at      timestamptz DEFAULT NULL,
  p_after_appointment_id uuid DEFAULT NULL
)
RETURNS TABLE (client_id uuid, appointment_id uuid, pending bigint, closed_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT e.client_id,
         e.appointment_id,
         sum(e.amount)::bigint AS pending,
         min(e.created_at) FILTER (WHERE e.kind = 'charge') AS closed_at
    FROM public.payments_ledger_entries e
   WHERE e.appointment_id IS NOT NULL
   GROUP BY e.client_id, e.appointment_id
  HAVING bool_or(e.kind = 'charge')
     AND sum(e.amount) > 0
     AND min(e.created_at) FILTER (WHERE e.kind = 'charge') <= p_closed_before
     AND (
       p_after_closed_at IS NULL
       OR (min(e.created_at) FILTER (WHERE e.kind = 'charge'), e.appointment_id)
          > (p_after_closed_at, coalesce(p_after_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid))
     )
   ORDER BY 4, 2
   LIMIT greatest(1, least(coalesce(p_limit, 500), 500));
$$;

REVOKE ALL ON FUNCTION public.payments_unpaid_charges(timestamptz, integer, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.payments_unpaid_charges(timestamptz, integer, timestamptz, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.payments_unpaid_charges(timestamptz, integer, timestamptz, uuid) TO authenticated;
