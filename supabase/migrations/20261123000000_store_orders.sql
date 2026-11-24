-- 20261123000000_store_orders.sql
-- US-SHOP-02 · feature store — el pedido que deja el checkout del carrito (contrato: criterios 1 a 3 del
-- backlog; decisiones de alcance de Erick Duran, 2026-11-23, en docs/process/DEPENDENCIES.md).
-- - Un pedido es una venta de una sola vez, no deuda de una cita: no vive en payments_ledger_entries
--   (eso es de citas, ARCH-005); vive entero en store, con su propio estado de aprobación.
-- - contact_phone y delivery_method/delivery_address son los "datos de contacto y entrega" del criterio 1.
--   Por ahora la única entrega es retiro en el estudio (decisión del PO, Kenny, 2026-11-24): el envío a
--   domicilio se saca de esta historia y queda como deuda. delivery_method/delivery_address se quedan en
--   la tabla (no se borran) y el CHECK fuerza 'pickup' sin dirección, para ampliarlo sin una migración
--   destructiva cuando el envío vuelva.
-- - receipt_path llega ya subido al bucket privado (pieza siguiente); aquí solo se guarda la ruta,
--   mismo patrón que delinquency_regularizations.
-- - Estados: pending_approval (recién creado), approved, rejected. Un pedido no se reemplaza: a
--   diferencia de una regularización, no hay "otro comprobante mientras está pendiente" en el alcance
--   de esta historia — si la clienta se equivocó, es un pedido nuevo.
-- - El CHECK de campos por estado impide guardar un rechazo sin motivo (mínimo 10 caracteres, misma
--   decisión que el rechazo de US-MOR-03) o una aprobación sin quién la decidió.
-- - RLS: la clienta lee solo sus pedidos; el personal lee todos. Nadie con sesión escribe esta tabla
--   directo (fail-closed): la única escritura es store_checkout (pieza siguiente) y las funciones de
--   aprobar/rechazar (piezas después del bucket), todas SECURITY DEFINER.
-- - store_order_items congela nombre y precio del producto al momento del pedido (mismo motivo que
--   technique_name en scheduling_appointments, DOM-002): si el precio del catálogo cambia después, el
--   pedido ya hecho no cambia.
-- Cumplimiento: ARCH-002, ARCH-005, ARCH-006 (prefijo store_), DOM-001, DOM-002, DOM-003, SEC-001,
-- SEC-002, PERF-003, INT-008.

CREATE TABLE public.store_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES public.clients_profiles(id) ON DELETE RESTRICT,
  contact_phone    text NOT NULL CHECK (length(btrim(contact_phone)) BETWEEN 8 AND 20),
  delivery_method  text NOT NULL CHECK (delivery_method = 'pickup'),
  delivery_address text CHECK (delivery_address IS NULL),
  total_crc        bigint NOT NULL CHECK (total_crc > 0),
  receipt_path     text NOT NULL CHECK (length(receipt_path) BETWEEN 1 AND 300),
  state            text NOT NULL DEFAULT 'pending_approval'
                   CHECK (state IN ('pending_approval', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by      uuid REFERENCES auth.users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT store_orders_state_fields CHECK (
    (state = 'pending_approval'
      AND rejection_reason IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (state = 'approved'
      AND rejection_reason IS NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    OR (state = 'rejected'
      AND length(btrim(coalesce(rejection_reason, ''))) BETWEEN 10 AND 500
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX idx_store_orders_client_created ON public.store_orders (client_id, created_at DESC);
CREATE INDEX idx_store_orders_state_created ON public.store_orders (state, created_at);
CREATE INDEX idx_store_orders_reviewed_by ON public.store_orders (reviewed_by);

-- Congela cada línea del pedido: producto, nombre y precio unitario de ese momento (DOM-002).
CREATE TABLE public.store_order_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  product_name   text NOT NULL CHECK (length(btrim(product_name)) > 0),
  unit_price_crc integer NOT NULL CHECK (unit_price_crc >= 0),
  quantity       integer NOT NULL CHECK (quantity BETWEEN 1 AND 99)
);

CREATE INDEX idx_store_order_items_order ON public.store_order_items (order_id);
CREATE INDEX idx_store_order_items_product ON public.store_order_items (product_id);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_orders_select_own"
  ON public.store_orders
  FOR SELECT
  TO authenticated
  USING (client_id = (SELECT public.clients_current_profile_id()));

CREATE POLICY "store_orders_select_staff"
  ON public.store_orders
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

-- Igual que scheduling_appointment_package_techniques_select_own: identifica a la clienta por su
-- pedido dueño, nunca leyendo clients_profiles directo (ARCH-005).
CREATE POLICY "store_order_items_select_own"
  ON public.store_order_items
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.store_orders o
       WHERE o.client_id = (SELECT public.clients_current_profile_id())
    )
  );

CREATE POLICY "store_order_items_select_staff"
  ON public.store_order_items
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

-- Sin políticas de INSERT/UPDATE/DELETE en ninguna de las dos tablas: con RLS activo y sin una
-- permisiva, la base deniega todo INSERT a anon y a authenticated (fail-closed, SEC-001). Un UPDATE o
-- DELETE sin política coincidente no lanza error por sí solo, solo afecta cero filas (la condición
-- USING filtra todo) — así que además se revoca el privilegio de escritura explícito, igual que
-- delinquency_regularizations: el único camino de escritura es store_checkout y las funciones de
-- aprobar/rechazar, SECURITY DEFINER (piezas siguientes), que corren como el dueño de la tabla.
REVOKE INSERT, UPDATE, DELETE ON public.store_orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.store_order_items FROM PUBLIC, anon, authenticated;
