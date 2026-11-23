-- 20261123020000_store_checkout_fn.sql
-- US-SHOP-02 · feature store — la clienta finaliza la compra del carrito (criterios 1, 2 y 4 del
-- backlog; decisiones de Erick Duran, 2026-11-23, en docs/process/DEPENDENCIES.md).
--
-- store_checkout(telefono, metodo de entrega, direccion, ruta del comprobante) => uuid (el pedido)
-- - Responde solo por la clienta de la sesión (clients_current_profile_id); sin perfil de clienta,
--   `store_not_a_client` (42501).
-- - El teléfono de contacto va de 8 a 20 caracteres (`store_contact_phone_invalid`, 22023); el método
--   de entrega es 'pickup' o 'shipping' (`store_delivery_method_invalid`); con envío, la dirección es
--   obligatoria, de 1 a 300 caracteres (`store_delivery_address_required`); con retiro se ignora
--   cualquier dirección recibida, nunca se guarda.
-- - El comprobante tiene que estar ya subido en la carpeta de la clienta en el bucket privado y no
--   estar usado por otro pedido (`store_receipt_not_found` y `store_receipt_already_used`, 22023),
--   mismo patrón que delinquency_submit_regularization. La aplicación validó su contenido antes de
--   subirlo (DOM-008).
-- - El carrito tiene que tener al menos una línea de un producto activo (`store_cart_empty`, 22023);
--   una línea de un producto desactivado se ignora, igual que ya hace el carrito (store/db/cart-repository.ts).
-- - Existencias: se descuentan al enviar el pedido, no al aprobarlo (decisión de Erick Duran,
--   2026-11-23) — "reserva inmediata" para no vender lo que ya no hay. El `FOR UPDATE` bloquea cada
--   producto del carrito en el mismo orden (por id) antes de leer sus existencias, para que dos
--   checkouts simultáneos sobre el mismo producto no pasen los dos el chequeo a la vez (mismo
--   principio que el exclusion constraint de DOM-010, aunque aquí no hay rango que se solape: es un
--   descuento atómico con bloqueo de fila, no una verificación en la aplicación). Si no alcanza,
--   `store_insufficient_stock` (22023) con el id del producto en el DETAIL, antes de escribir nada.
-- - Precio y nombre del producto quedan congelados en store_order_items al momento del pedido
--   (DOM-002): si el catálogo cambia después, el pedido ya hecho no cambia.
-- - En una sola transacción (DOM-011): crea el pedido y sus líneas, descuenta las existencias y vacía
--   el carrito de la clienta. Si algo falla a mitad de camino, la función entera se deshace: no queda
--   un pedido sin líneas ni existencias descontadas sin pedido.
-- - Deja `store.order.created` en la bitácora.
-- SECURITY DEFINER: la clienta no tiene EXECUTE sobre UPDATE de store_products ni escribe
-- store_orders/store_order_items directo; la función corre con los permisos del dueño. anon no tiene
-- EXECUTE.
-- Cumplimiento: ARCH-005, DOM-001, DOM-002, DOM-008, DOM-011, SEC-001, SEC-002, SEC-005, INT-003, INT-008.

CREATE FUNCTION public.store_checkout(
  p_contact_phone    text,
  p_delivery_method  text,
  p_delivery_address  text,
  p_receipt_path     text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_bucket CONSTANT text := 'store-order-receipts';

  v_client_id uuid;
  v_phone     text;
  v_address   text;
  v_order_id  uuid;
  v_total     bigint := 0;
  v_line      record;
BEGIN
  v_client_id := public.clients_current_profile_id();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'store_not_a_client' USING ERRCODE = '42501';
  END IF;

  v_phone := btrim(coalesce(p_contact_phone, ''));
  IF length(v_phone) NOT BETWEEN 8 AND 20 THEN
    RAISE EXCEPTION 'store_contact_phone_invalid' USING ERRCODE = '22023';
  END IF;

  IF p_delivery_method NOT IN ('pickup', 'shipping') THEN
    RAISE EXCEPTION 'store_delivery_method_invalid' USING ERRCODE = '22023';
  END IF;

  IF p_delivery_method = 'shipping' THEN
    v_address := nullif(btrim(coalesce(p_delivery_address, '')), '');
    IF v_address IS NULL OR length(v_address) > 300 THEN
      RAISE EXCEPTION 'store_delivery_address_required' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_address := NULL;
  END IF;

  IF p_receipt_path IS NULL
     OR (storage.foldername(p_receipt_path))[1] IS DISTINCT FROM v_client_id::text
     OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = c_bucket AND o.name = p_receipt_path)
  THEN
    RAISE EXCEPTION 'store_receipt_not_found' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.store_orders r WHERE r.receipt_path = p_receipt_path) THEN
    RAISE EXCEPTION 'store_receipt_already_used' USING ERRCODE = '22023';
  END IF;

  -- Bloquea cada producto del carrito, siempre en el mismo orden (por id), antes de leer existencias.
  PERFORM 1
    FROM public.store_products p
    JOIN public.store_cart_items ci ON ci.product_id = p.id
   WHERE ci.user_id = auth.uid()
   ORDER BY p.id
   FOR UPDATE OF p;

  FOR v_line IN
    SELECT p.id, p.nombre, p.precio_crc, p.existencias, ci.cantidad
      FROM public.store_cart_items ci
      JOIN public.store_products p ON p.id = ci.product_id
     WHERE ci.user_id = auth.uid() AND p.activo
     ORDER BY p.id
  LOOP
    IF v_line.existencias < v_line.cantidad THEN
      RAISE EXCEPTION 'store_insufficient_stock' USING ERRCODE = '22023', DETAIL = v_line.id::text;
    END IF;
    v_total := v_total + (v_line.precio_crc::bigint * v_line.cantidad);
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'store_cart_empty' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.store_orders (client_id, contact_phone, delivery_method, delivery_address, total_crc, receipt_path)
  VALUES (v_client_id, v_phone, p_delivery_method, v_address, v_total, p_receipt_path)
  RETURNING id INTO v_order_id;

  FOR v_line IN
    SELECT p.id, p.nombre, p.precio_crc, ci.cantidad
      FROM public.store_cart_items ci
      JOIN public.store_products p ON p.id = ci.product_id
     WHERE ci.user_id = auth.uid() AND p.activo
     ORDER BY p.id
  LOOP
    INSERT INTO public.store_order_items (order_id, product_id, product_name, unit_price_crc, quantity)
    VALUES (v_order_id, v_line.id, v_line.nombre, v_line.precio_crc, v_line.cantidad);

    UPDATE public.store_products SET existencias = existencias - v_line.cantidad WHERE id = v_line.id;
  END LOOP;

  DELETE FROM public.store_cart_items WHERE user_id = auth.uid();

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'store.order.created',
    'store_order',
    v_order_id,
    jsonb_build_object(
      'clientId',       v_client_id,
      'totalCrc',       v_total,
      'deliveryMethod', p_delivery_method
    )
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.store_checkout(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_checkout(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.store_checkout(text, text, text, text) TO authenticated;
