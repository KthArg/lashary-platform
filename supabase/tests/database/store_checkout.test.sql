-- store_checkout.test.sql
-- US-SHOP-02 · store — la clienta finaliza la compra del carrito: contacto y entrega válidos, el
-- comprobante tiene que ser suyo y sin usar, el carrito no puede estar vacío ni pedir más de lo que
-- hay, el pedido congela nombre y precio de cada línea, las existencias se descuentan al momento y el
-- carrito queda vacío. Nadie fuera de una clienta con perfil llama la función. Todo se deshace con
-- ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000022a01', 'checkout-admin@test.local'),
  ('00000000-0000-0000-0000-000000022a02', 'checkout-clienta-a@test.local'),
  ('00000000-0000-0000-0000-000000022a03', 'checkout-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000022a01';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000022c02', '00000000-0000-0000-0000-000000022a02', 'Clienta A', 'checkout-clienta-a@test.local', '+50688890002'),
  ('00000000-0000-0000-0000-000000022c03', '00000000-0000-0000-0000-000000022a03', 'Clienta B', 'checkout-clienta-b@test.local', '+50688890003');

INSERT INTO public.store_products (id, slug, nombre, descripcion, url_imagen, precio_crc, activo, existencias)
VALUES
  ('00000000-0000-0000-0000-000000022d01', 'checkout-serum', 'Serum', '', '/s.jpg', 1000, true, 5),
  ('00000000-0000-0000-0000-000000022d02', 'checkout-cepillo', 'Cepillo', '', '/c.jpg', 2000, true, 2),
  ('00000000-0000-0000-0000-000000022d03', 'checkout-descontinuado', 'Descontinuado', '', '/d.jpg', 500, false, 10);

INSERT INTO storage.objects (bucket_id, name)
VALUES
  ('store-order-receipts', '00000000-0000-0000-0000-000000022c02/r1.jpg'),
  ('store-order-receipts', '00000000-0000-0000-0000-000000022c02/r2.jpg'),
  ('store-order-receipts', '00000000-0000-0000-0000-000000022c03/rb.jpg');

-- ── La clienta A arma su carrito (incluida una línea de un producto desactivado) ──
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000022a02","role":"authenticated"}', true);

INSERT INTO public.store_cart_items (user_id, product_id, cantidad) VALUES
  ('00000000-0000-0000-0000-000000022a02', '00000000-0000-0000-0000-000000022d01', 2);
-- d02 y d03 se agregan directo en la base: d03 está desactivado y la política de INSERT del carrito
-- lo rechazaría (store_cart_items_insert_own exige producto activo); esta línea simula un carrito que
-- ya tenía un producto antes de desactivarse.
RESET ROLE;
INSERT INTO public.store_cart_items (user_id, product_id, cantidad) VALUES
  ('00000000-0000-0000-0000-000000022a02', '00000000-0000-0000-0000-000000022d02', 1),
  ('00000000-0000-0000-0000-000000022a02', '00000000-0000-0000-0000-000000022d03', 1);
SET LOCAL ROLE authenticated;

-- ── Contacto y entrega ─────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.store_checkout('', 'pickup', NULL, '00000000-0000-0000-0000-000000022c02/r1.jpg')$$,
  '22023', 'store_contact_phone_invalid', 'un teléfono de contacto vacío se rechaza');

SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'avion', NULL, '00000000-0000-0000-0000-000000022c02/r1.jpg')$$,
  '22023', 'store_delivery_method_invalid', 'un método de entrega que no es retiro ni envío se rechaza');

SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'shipping', NULL, '00000000-0000-0000-0000-000000022c02/r1.jpg')$$,
  '22023', 'store_delivery_address_required', 'envío sin dirección se rechaza');

-- ── El comprobante ─────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'pickup', NULL, '00000000-0000-0000-0000-000000022c02/no-existe.jpg')$$,
  '22023', 'store_receipt_not_found', 'no se usa un comprobante que no se subió');

SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'pickup', NULL, '00000000-0000-0000-0000-000000022c03/rb.jpg')$$,
  '22023', 'store_receipt_not_found', 'no se usa un comprobante de la carpeta de otra clienta');

-- ── Checkout exitoso: retiro, excluye el producto desactivado ──────────────────
CREATE TEMP TABLE order_a AS
  SELECT public.store_checkout('88880000', 'pickup', NULL, '00000000-0000-0000-0000-000000022c02/r1.jpg') AS id;

RESET ROLE;

SELECT is((SELECT total_crc FROM public.store_orders WHERE id = (SELECT id FROM order_a)),
  4000::bigint, 'el total es la suma de las líneas activas: 2×1000 + 1×2000, sin el producto desactivado');

SELECT is(
  (SELECT delivery_method || '|' || coalesce(delivery_address, '') FROM public.store_orders WHERE id = (SELECT id FROM order_a)),
  'pickup|', 'retiro sin dirección se guarda así');

SELECT is((SELECT state FROM public.store_orders WHERE id = (SELECT id FROM order_a)),
  'pending_approval', 'el pedido nace pendiente de aprobación');

SELECT is((SELECT count(*)::int FROM public.store_order_items WHERE order_id = (SELECT id FROM order_a)),
  2, 'el pedido tiene dos líneas: el producto desactivado no entra');

SELECT is((SELECT existencias FROM public.store_products WHERE id = '00000000-0000-0000-0000-000000022d01'),
  3, 'las existencias del primer producto bajan en la cantidad pedida (5 − 2)');

SELECT is((SELECT existencias FROM public.store_products WHERE id = '00000000-0000-0000-0000-000000022d02'),
  1, 'las existencias del segundo producto bajan en la cantidad pedida (2 − 1)');

SELECT is((SELECT count(*)::int FROM public.store_cart_items WHERE user_id = '00000000-0000-0000-0000-000000022a02'),
  0, 'el carrito queda vacío tras el pedido, incluida la línea del producto desactivado');

SELECT is(
  (SELECT actor_id::text FROM public.audit_events
    WHERE action = 'store.order.created' AND entity_id = (SELECT id FROM order_a)),
  '00000000-0000-0000-0000-000000022a02', 'el pedido queda en la bitácora con la clienta como actor');

SET LOCAL ROLE authenticated;

-- ── Carrito vacío ──────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'pickup', NULL, '00000000-0000-0000-0000-000000022c02/r2.jpg')$$,
  '22023', 'store_cart_empty', 'un carrito vacío no genera pedido');

-- ── Existencias insuficientes ───────────────────────────────────────────────────
INSERT INTO public.store_cart_items (user_id, product_id, cantidad) VALUES
  ('00000000-0000-0000-0000-000000022a02', '00000000-0000-0000-0000-000000022d01', 10);

SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'pickup', NULL, '00000000-0000-0000-0000-000000022c02/r2.jpg')$$,
  '22023', 'store_insufficient_stock', 'pedir más unidades que las existencias se rechaza');

-- ── Checkout exitoso: envío, con lo que sí alcanza ─────────────────────────────
UPDATE public.store_cart_items SET cantidad = 2
 WHERE user_id = '00000000-0000-0000-0000-000000022a02' AND product_id = '00000000-0000-0000-0000-000000022d01';

CREATE TEMP TABLE order_a2 AS
  SELECT public.store_checkout('88880000', 'shipping', 'San José, Costa Rica', '00000000-0000-0000-0000-000000022c02/r2.jpg') AS id;

RESET ROLE;

SELECT is(
  (SELECT delivery_method || '|' || delivery_address FROM public.store_orders WHERE id = (SELECT id FROM order_a2)),
  'shipping|San José, Costa Rica', 'envío con dirección se guarda con la dirección recibida');

SELECT is((SELECT existencias FROM public.store_products WHERE id = '00000000-0000-0000-0000-000000022d01'),
  1, 'las existencias siguen bajando con cada pedido (3 − 2)');

SET LOCAL ROLE authenticated;

-- ── Un comprobante no se usa dos veces ──────────────────────────────────────────
INSERT INTO public.store_cart_items (user_id, product_id, cantidad) VALUES
  ('00000000-0000-0000-0000-000000022a02', '00000000-0000-0000-0000-000000022d02', 1);

SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'pickup', NULL, '00000000-0000-0000-0000-000000022c02/r1.jpg')$$,
  '22023', 'store_receipt_already_used', 'un comprobante ya usado en otro pedido se rechaza');

-- ── Quién no puede ─────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000022a01","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'pickup', NULL, '00000000-0000-0000-0000-000000022c02/r1.jpg')$$,
  '42501', 'store_not_a_client', 'una sesión sin perfil de clienta no finaliza una compra');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.store_checkout('88880000', 'pickup', NULL, 'x/r1.jpg')$$,
  '42501', NULL, 'anon no finaliza compras');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
