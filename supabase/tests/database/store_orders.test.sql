-- store_orders.test.sql
-- US-SHOP-02 · store — store_orders y store_order_items: cada estado exige sus campos, por ahora solo
-- retiro en el estudio (el envío a domicilio queda fuera de esta historia, decisión del PO del
-- 2026-11-24; delivery_method/delivery_address se quedan en la tabla para ampliarlo después), la
-- clienta lee solo sus propios pedidos y sus líneas (SEC-002), el personal lee todos, y nadie con
-- sesión escribe ninguna de las dos tablas directo (SEC-001). Las filas se escriben como dueño de la
-- tabla; todo se deshace con ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000020a01', 'orders-admin@test.local'),
  ('00000000-0000-0000-0000-000000020a02', 'orders-clienta-a@test.local'),
  ('00000000-0000-0000-0000-000000020a03', 'orders-clienta-b@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000020a01';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000020c02', '00000000-0000-0000-0000-000000020a02', 'Clienta A', 'orders-clienta-a@test.local', '+50688887012'),
  ('00000000-0000-0000-0000-000000020c03', '00000000-0000-0000-0000-000000020a03', 'Clienta B', 'orders-clienta-b@test.local', '+50688887013');

INSERT INTO public.store_products (id, slug, nombre, descripcion, url_imagen, precio_crc, activo, existencias)
VALUES ('00000000-0000-0000-0000-000000020d01', 'orders-test-product', 'Producto de prueba', '', '/x.jpg', 5000, true, 10);

-- ── Campos por método de entrega ────────────────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO public.store_orders (client_id, contact_phone, delivery_method, delivery_address, total_crc, receipt_path)
    VALUES ('00000000-0000-0000-0000-000000020c02', '88887012', 'pickup', 'Calle falsa 123', 5000, '00000000-0000-0000-0000-000000020c02/r1.jpg')$$,
  '23514', NULL, 'retiro con dirección se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.store_orders (client_id, contact_phone, delivery_method, total_crc, receipt_path)
    VALUES ('00000000-0000-0000-0000-000000020c02', '88887012', 'shipping', 5000, '00000000-0000-0000-0000-000000020c02/r2.jpg')$$,
  '23514', NULL, 'un método de entrega distinto de retiro se rechaza (sin envío por ahora)');

SELECT throws_ok(
  $$INSERT INTO public.store_orders (client_id, contact_phone, delivery_method, total_crc, receipt_path)
    VALUES ('00000000-0000-0000-0000-000000020c02', '12', 'pickup', 5000, '00000000-0000-0000-0000-000000020c02/r3.jpg')$$,
  '23514', NULL, 'un teléfono de contacto demasiado corto se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.store_orders (client_id, contact_phone, delivery_method, total_crc, receipt_path)
    VALUES ('00000000-0000-0000-0000-000000020c02', '88887012', 'pickup', 0, '00000000-0000-0000-0000-000000020c02/r4.jpg')$$,
  '23514', NULL, 'un total de cero o negativo se rechaza');

SELECT lives_ok(
  $$INSERT INTO public.store_orders (id, client_id, contact_phone, delivery_method, total_crc, receipt_path)
    VALUES ('00000000-0000-0000-0000-000000020e01', '00000000-0000-0000-0000-000000020c02', '88887012', 'pickup', 5000, '00000000-0000-0000-0000-000000020c02/r5.jpg')$$,
  'retiro sin dirección se guarda');

SELECT is((SELECT state FROM public.store_orders WHERE id = '00000000-0000-0000-0000-000000020e01'),
  'pending_approval', 'un pedido nace pendiente de aprobación');

SELECT lives_ok(
  $$INSERT INTO public.store_orders (id, client_id, contact_phone, delivery_method, total_crc, receipt_path)
    VALUES ('00000000-0000-0000-0000-000000020e02', '00000000-0000-0000-0000-000000020c03', '88887013', 'pickup', 5000, '00000000-0000-0000-0000-000000020c03/r6.jpg')$$,
  'el pedido de otra clienta también se guarda');

-- ── Aprobar y rechazar: cada estado exige sus campos ───────────────────────────
SELECT throws_ok(
  $$UPDATE public.store_orders SET state = 'approved' WHERE id = '00000000-0000-0000-0000-000000020e01'$$,
  '23514', NULL, 'aprobado sin quién lo decidió se rechaza');

SELECT throws_ok(
  $$UPDATE public.store_orders SET state = 'rejected', rejection_reason = 'corto',
       reviewed_by = '00000000-0000-0000-0000-000000020a01', reviewed_at = now()
     WHERE id = '00000000-0000-0000-0000-000000020e01'$$,
  '23514', NULL, 'rechazado con motivo de menos de 10 caracteres se rechaza');

SELECT lives_ok(
  $$UPDATE public.store_orders SET state = 'approved',
       reviewed_by = '00000000-0000-0000-0000-000000020a01', reviewed_at = now()
     WHERE id = '00000000-0000-0000-0000-000000020e01'$$,
  'aprobado con quién lo decidió se guarda');

-- ── store_order_items: congela producto, nombre, precio y cantidad ─────────────
SELECT throws_ok(
  $$INSERT INTO public.store_order_items (order_id, product_id, product_name, unit_price_crc, quantity)
    VALUES ('00000000-0000-0000-0000-000000020e01', '00000000-0000-0000-0000-000000020d01', 'Producto de prueba', 5000, 0)$$,
  '23514', NULL, 'una línea con cantidad cero se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.store_order_items (order_id, product_id, product_name, unit_price_crc, quantity)
    VALUES ('00000000-0000-0000-0000-000000020e01', '00000000-0000-0000-0000-000000020d01', 'Producto de prueba', -1, 1)$$,
  '23514', NULL, 'un precio unitario negativo se rechaza');

SELECT lives_ok(
  $$INSERT INTO public.store_order_items (id, order_id, product_id, product_name, unit_price_crc, quantity)
    VALUES ('00000000-0000-0000-0000-000000020f01', '00000000-0000-0000-0000-000000020e01', '00000000-0000-0000-0000-000000020d01', 'Producto de prueba', 5000, 1)$$,
  'una línea válida se guarda');

-- ── Quién lee ────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020a02","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*)::int FROM public.store_orders), 1,
  'la clienta A ve solo su propio pedido, no el de la clienta B');

SELECT is((SELECT count(*)::int FROM public.store_order_items), 1,
  'la clienta A ve solo las líneas de su propio pedido');

SELECT throws_ok(
  $$INSERT INTO public.store_orders (client_id, contact_phone, delivery_method, total_crc, receipt_path)
    VALUES ('00000000-0000-0000-0000-000000020c02', '88887012', 'pickup', 1000, 'x/r7.jpg')$$,
  '42501', NULL, 'la clienta no inserta un pedido directo en la tabla');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020a03","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*)::int FROM public.store_orders WHERE id = '00000000-0000-0000-0000-000000020e01'),
  0, 'la clienta B no ve el pedido de la clienta A');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020a01","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- Contado por clienta, no por tabla entera: otras pruebas (como la integración de store_checkout
-- contra Supabase local) dejan pedidos reales comiteados que un conteo sin filtrar también contaría.
SELECT is(
  (SELECT count(*)::int FROM public.store_orders
    WHERE client_id IN ('00000000-0000-0000-0000-000000020c02', '00000000-0000-0000-0000-000000020c03')),
  2, 'el personal ve los pedidos de las dos clientas de esta prueba');

SELECT is(
  (SELECT count(*)::int FROM public.store_order_items WHERE order_id IN (
    '00000000-0000-0000-0000-000000020e01', '00000000-0000-0000-0000-000000020e02')),
  1, 'el personal ve las líneas de los pedidos de esta prueba');

SELECT throws_ok(
  $$UPDATE public.store_orders SET total_crc = 1 WHERE id = '00000000-0000-0000-0000-000000020e01'$$,
  '42501', NULL, 'ni el personal cambia un pedido directo en la tabla');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
