-- catalog_promotions_public_read_window.test.sql
-- US-PROM-01 · feature catalog — auditoría M3 (2026-11-02): la lectura pública de
-- catalog_promotions solo ve lo vigente (is_active AND starts_at <= now() AND ends_at >= now());
-- antes de este arreglo, una sola política "USING (true)" dejaba ver por PostgREST cualquier
-- promoción pausada, vencida o futura a cualquiera, incluida la anónima. El staff (auth_is_staff())
-- sigue viendo todas para el panel de administración.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-00000000f001', 'promo-window-admin@test.local'),
  ('00000000-0000-0000-0000-00000000f002', 'promo-window-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-00000000f001';

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, deposit, aftercare_text)
VALUES
  ('00000000-0000-0000-0000-00000000f003', 'zz-test ventana promo', 'lash_classic', 20000, 90, 5000, 'cuidados');

INSERT INTO public.catalog_promotions (id, technique_id, discount_percent, starts_at, ends_at, is_active)
VALUES
  ('00000000-0000-0000-0000-00000000f004', '00000000-0000-0000-0000-00000000f003', 20,
    now() - interval '1 day', now() + interval '1 day', true),
  ('00000000-0000-0000-0000-00000000f005', '00000000-0000-0000-0000-00000000f003', 20,
    now() - interval '10 day', now() - interval '1 day', true),
  ('00000000-0000-0000-0000-00000000f006', '00000000-0000-0000-0000-00000000f003', 20,
    now() + interval '1 day', now() + interval '10 day', true),
  ('00000000-0000-0000-0000-00000000f007', '00000000-0000-0000-0000-00000000f003', 20,
    now() - interval '1 day', now() + interval '1 day', false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000f002","role":"authenticated"}', true);

SELECT is(public.auth_is_staff(), false, 'clienta: auth_is_staff() es false');

SELECT isnt_empty(
  $$SELECT * FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000f004'$$,
  'clienta: ve la vigente');
SELECT is_empty(
  $$SELECT * FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000f005'$$,
  'clienta: no ve la vencida');
SELECT is_empty(
  $$SELECT * FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000f006'$$,
  'clienta: no ve la futura');
SELECT is_empty(
  $$SELECT * FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000f007'$$,
  'clienta: no ve la pausada aunque esté en ventana');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT isnt_empty(
  $$SELECT * FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000f004'$$,
  'anónimo: ve la vigente, igual que la clienta');
SELECT is_empty(
  $$SELECT * FROM public.catalog_promotions WHERE id = '00000000-0000-0000-0000-00000000f005'$$,
  'anónimo: no ve la vencida');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000f001","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.catalog_promotions
    WHERE id IN (
      '00000000-0000-0000-0000-00000000f004', '00000000-0000-0000-0000-00000000f005',
      '00000000-0000-0000-0000-00000000f006', '00000000-0000-0000-0000-00000000f007'
    )),
  4, 'staff: ve las cuatro, vigente y las tres que no lo son, para el panel de administración');

SELECT * FROM finish();
ROLLBACK;
