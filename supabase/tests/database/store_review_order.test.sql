-- store_review_order.test.sql
-- US-SHOP-02 · store — la administradora aprueba o rechaza un pedido pendiente: aprobar no toca
-- existencias, rechazar las devuelve y exige un motivo de 10 a 500 caracteres, ninguna de las dos
-- revisa un pedido ya revisado, y solo la administradora puede llamarlas. Todo se deshace con
-- ROLLBACK y no se usa la service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000023a01', 'review-admin@test.local'),
  ('00000000-0000-0000-0000-000000023a02', 'review-clienta-a@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-000000023a01';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-000000023c02', '00000000-0000-0000-0000-000000023a02', 'Clienta A', 'review-clienta-a@test.local', '+50688891002');

-- d01 y d02 ya tienen sus existencias descontadas por un store_checkout anterior (5 − 2 y 5 − 1).
INSERT INTO public.store_products (id, slug, nombre, descripcion, url_imagen, precio_crc, activo, existencias)
VALUES
  ('00000000-0000-0000-0000-000000023d01', 'review-serum', 'Serum', '', '/s.jpg', 1000, true, 3),
  ('00000000-0000-0000-0000-000000023d02', 'review-cepillo', 'Cepillo', '', '/c.jpg', 2000, true, 4);

INSERT INTO public.store_orders (id, client_id, contact_phone, delivery_method, total_crc, receipt_path)
VALUES
  ('00000000-0000-0000-0000-000000023e01', '00000000-0000-0000-0000-000000023c02', '88891002', 'pickup', 2000, '00000000-0000-0000-0000-000000023c02/r1.jpg'),
  ('00000000-0000-0000-0000-000000023e02', '00000000-0000-0000-0000-000000023c02', '88891002', 'pickup', 2000, '00000000-0000-0000-0000-000000023c02/r2.jpg');

INSERT INTO public.store_order_items (order_id, product_id, product_name, unit_price_crc, quantity)
VALUES
  ('00000000-0000-0000-0000-000000023e01', '00000000-0000-0000-0000-000000023d01', 'Serum', 1000, 2),
  ('00000000-0000-0000-0000-000000023e02', '00000000-0000-0000-0000-000000023d02', 'Cepillo', 2000, 1);

-- ── Quién puede ────────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000023a02","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.store_approve_order('00000000-0000-0000-0000-000000023e01')$$,
  '42501', 'store_not_admin', 'una clienta no aprueba un pedido');

SELECT throws_ok(
  $$SELECT public.store_reject_order('00000000-0000-0000-0000-000000023e02', 'motivo suficientemente largo')$$,
  '42501', 'store_not_admin', 'una clienta no rechaza un pedido');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000023a01","role":"authenticated"}', true);

-- ── Aprobar ────────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.store_approve_order('00000000-0000-0000-0000-000000023eff')$$,
  'P0002', 'store_order_not_found', 'no se aprueba un pedido que no existe');

SELECT lives_ok(
  $$SELECT public.store_approve_order('00000000-0000-0000-0000-000000023e01')$$,
  'la administradora aprueba un pedido pendiente');

RESET ROLE;

SELECT is(
  (SELECT state || '|' || reviewed_by::text FROM public.store_orders WHERE id = '00000000-0000-0000-0000-000000023e01'),
  'approved|00000000-0000-0000-0000-000000023a01', 'el pedido queda aprobado con quién lo decidió');

SELECT is((SELECT existencias FROM public.store_products WHERE id = '00000000-0000-0000-0000-000000023d01'),
  3, 'aprobar no toca las existencias: ya se descontaron al enviar el pedido');

SELECT is(
  (SELECT actor_id::text FROM public.audit_events
    WHERE action = 'store.order.approved' AND entity_id = '00000000-0000-0000-0000-000000023e01'),
  '00000000-0000-0000-0000-000000023a01', 'la aprobación queda en la bitácora');

SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.store_approve_order('00000000-0000-0000-0000-000000023e01')$$,
  '55000', 'store_order_not_pending', 'un pedido ya aprobado no se vuelve a aprobar');

-- ── Rechazar ───────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.store_reject_order('00000000-0000-0000-0000-000000023e02', 'corto')$$,
  '22023', 'store_rejection_reason_required', 'un motivo de menos de 10 caracteres se rechaza');

SELECT lives_ok(
  $$SELECT public.store_reject_order('00000000-0000-0000-0000-000000023e02', 'El comprobante no corresponde al monto')$$,
  'la administradora rechaza un pedido pendiente con motivo');

RESET ROLE;

SELECT is(
  (SELECT state || '|' || rejection_reason FROM public.store_orders WHERE id = '00000000-0000-0000-0000-000000023e02'),
  'rejected|El comprobante no corresponde al monto', 'el pedido queda rechazado con su motivo');

SELECT is((SELECT existencias FROM public.store_products WHERE id = '00000000-0000-0000-0000-000000023d02'),
  5, 'rechazar devuelve las existencias de cada línea del pedido (4 + 1)');

SELECT is(
  (SELECT payload ->> 'reason' FROM public.audit_events
    WHERE action = 'store.order.rejected' AND entity_id = '00000000-0000-0000-0000-000000023e02'),
  'El comprobante no corresponde al monto', 'el rechazo queda en la bitácora con el motivo');

SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.store_reject_order('00000000-0000-0000-0000-000000023e02', 'otro motivo también largo')$$,
  '55000', 'store_order_not_pending', 'un pedido ya rechazado no se vuelve a rechazar');

SELECT throws_ok(
  $$SELECT public.store_reject_order('00000000-0000-0000-0000-000000023eff', 'motivo suficientemente largo')$$,
  'P0002', 'store_order_not_found', 'no se rechaza un pedido que no existe');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.store_approve_order('00000000-0000-0000-0000-000000023e01')$$,
  '42501', NULL, 'anon no aprueba pedidos');

SELECT throws_ok(
  $$SELECT public.store_reject_order('00000000-0000-0000-0000-000000023e01', 'motivo suficientemente largo')$$,
  '42501', NULL, 'anon no rechaza pedidos');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
