-- 20261123030000_store_review_order_fns.sql
-- US-SHOP-02 · feature store — la administradora aprueba o rechaza un pedido (criterio 3 del backlog;
-- decisiones de Erick Duran, 2026-11-23, en docs/process/DEPENDENCIES.md).
--
-- store_approve_order(pedido) => void
-- - Solo administradora (`store_not_admin`, 42501).
-- - El pedido tiene que existir y estar pendiente: si no existe, `store_order_not_found` (P0002); si ya
--   se revisó, `store_order_not_pending` (55000).
-- - No toca existencias: ya se descontaron al enviar el pedido (store_checkout). Aprobar solo deja
--   constancia de que el personal verificó el comprobante.
-- - Deja `store.order.approved` en la bitácora en la misma transacción (DOM-011).
--
-- store_reject_order(pedido, motivo) => void
-- - Solo administradora (`store_not_admin`, 42501); mismos `store_order_not_found`/`store_order_not_pending`.
-- - El motivo lleva de 10 a 500 caracteres (`store_rejection_reason_required`, 22023), misma decisión
--   que el motivo de rechazo de US-MOR-03 (Kenny, 2026-11-13).
-- - Devuelve las existencias de cada línea del pedido, en el mismo orden de producto que bloquea
--   store_checkout, para no entrar en deadlock con un checkout simultáneo del mismo producto: un
--   pedido rechazado no reserva nada (decisión de Erick Duran, 2026-11-23). La clienta ve el motivo
--   y puede volver a intentarlo con un pedido nuevo — a diferencia de una regularización, un pedido
--   no se reemplaza.
-- - Deja `store.order.rejected` en la bitácora, con las existencias devueltas, en la misma transacción.
--
-- Las dos leen el pedido con `FOR UPDATE`: dos revisiones simultáneas del mismo pedido (dos pestañas,
-- o aprobar y rechazar a la vez) se serializan por esa fila — la segunda espera a que la primera
-- termine, lee el estado ya decidido y responde `store_order_not_pending` en vez de aprobar o
-- devolver existencias dos veces.
--
-- Las dos son SECURITY DEFINER porque la administradora no tiene UPDATE sobre store_orders ni
-- store_products directo; corren con los permisos del dueño. anon no tiene EXECUTE.
-- Cumplimiento: DOM-005, DOM-011, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

CREATE FUNCTION public.store_approve_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.store_orders;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'store_not_admin' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM public.store_orders o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store_order_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_order.state <> 'pending_approval' THEN
    RAISE EXCEPTION 'store_order_not_pending' USING ERRCODE = '55000';
  END IF;

  UPDATE public.store_orders o
     SET state = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE o.id = p_order_id;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'store.order.approved',
    'store_order',
    p_order_id,
    jsonb_build_object('clientId', v_order.client_id, 'totalCrc', v_order.total_crc)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.store_approve_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_approve_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.store_approve_order(uuid) TO authenticated;

CREATE FUNCTION public.store_reject_order(
  p_order_id uuid,
  p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_min_reason CONSTANT integer := 10;
  c_max_reason CONSTANT integer := 500;

  v_order  public.store_orders;
  v_reason text;
  v_item   record;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'store_not_admin' USING ERRCODE = '42501';
  END IF;

  v_reason := btrim(coalesce(p_reason, ''));
  IF length(v_reason) NOT BETWEEN c_min_reason AND c_max_reason THEN
    RAISE EXCEPTION 'store_rejection_reason_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM public.store_orders o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store_order_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_order.state <> 'pending_approval' THEN
    RAISE EXCEPTION 'store_order_not_pending' USING ERRCODE = '55000';
  END IF;

  FOR v_item IN
    SELECT product_id, quantity FROM public.store_order_items WHERE order_id = p_order_id ORDER BY product_id
  LOOP
    UPDATE public.store_products SET existencias = existencias + v_item.quantity
     WHERE id = v_item.product_id;
  END LOOP;

  UPDATE public.store_orders o
     SET state = 'rejected', rejection_reason = v_reason, reviewed_by = auth.uid(), reviewed_at = now()
   WHERE o.id = p_order_id;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'store.order.rejected',
    'store_order',
    p_order_id,
    jsonb_build_object('clientId', v_order.client_id, 'totalCrc', v_order.total_crc, 'reason', v_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.store_reject_order(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_reject_order(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.store_reject_order(uuid, text) TO authenticated;
