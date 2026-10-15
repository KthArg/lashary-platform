BEGIN;
SELECT plan(5);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000005c1', 'clienta-carrito@test.local');

INSERT INTO public.store_products (id, slug, nombre, url_imagen, precio_crc, activo)
VALUES
  ('00000000-0000-0000-0000-00000000ca01', 'zz-carrito-activo', 'zz carrito activo', '/x.jpg', 1000, true),
  ('00000000-0000-0000-0000-00000000ca02', 'zz-carrito-inactivo', 'zz carrito inactivo', '/x.jpg', 1000, false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005c1","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO public.store_cart_items (user_id, product_id, cantidad)
    VALUES ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-00000000ca01', 1)$$,
  'clienta: agrega un producto activo');

SELECT throws_ok(
  $$INSERT INTO public.store_cart_items (user_id, product_id, cantidad)
    VALUES ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-00000000ca02', 1)$$,
  '42501', NULL,
  'clienta: no agrega un producto desactivado');

RESET ROLE;
UPDATE public.store_products SET activo = false
 WHERE id = '00000000-0000-0000-0000-00000000ca01';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$UPDATE public.store_cart_items SET cantidad = 2
     WHERE product_id = '00000000-0000-0000-0000-00000000ca01'$$,
  '42501', NULL,
  'clienta: no cambia la cantidad de un producto que se desactivó');

SELECT lives_ok(
  $$DELETE FROM public.store_cart_items
     WHERE product_id = '00000000-0000-0000-0000-00000000ca01'$$,
  'clienta: quita la línea de un producto que se desactivó');

SELECT is(
  (SELECT count(*)::int FROM public.store_cart_items),
  0, 'clienta: el carrito queda vacío');

SELECT * FROM finish();
ROLLBACK;
