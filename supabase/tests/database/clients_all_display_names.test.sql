-- clients_all_display_names.test.sql
-- US-NOT-06 · clients — el nombre de todas las clientas que la sesión puede ver (contrato:
-- docs/contracts/clients-api.md). La administradora ve todas, incluida la clienta sin cuenta; una clienta solo
-- la suya (SEC-002); anon no la ejecuta; sin datos de contacto. Todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000027a1', 'todas-a@test.local'),
  ('00000000-0000-0000-0000-0000000027a2', 'todas-b@test.local'),
  ('00000000-0000-0000-0000-0000000027a9', 'todas-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000027a9';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000027c1', '00000000-0000-0000-0000-0000000027a1',
   'Todas A', 'todas-a@test.local', '+50688882701'),
  ('00000000-0000-0000-0000-0000000027c2', '00000000-0000-0000-0000-0000000027a2',
   'Todas B', 'todas-b@test.local', '+50688882702'),
  ('00000000-0000-0000-0000-0000000027c3', NULL,
   'Todas C sin cuenta', 'todas-c@test.local', '+50688882703');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000027a9","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id, full_name FROM public.clients_all_display_names()
     WHERE client_id IN ('00000000-0000-0000-0000-0000000027c1', '00000000-0000-0000-0000-0000000027c2',
                         '00000000-0000-0000-0000-0000000027c3')
     ORDER BY client_id$$,
  $$VALUES ('00000000-0000-0000-0000-0000000027c1'::uuid, 'Todas A'::text),
           ('00000000-0000-0000-0000-0000000027c2'::uuid, 'Todas B'::text),
           ('00000000-0000-0000-0000-0000000027c3'::uuid, 'Todas C sin cuenta'::text)$$,
  'la administradora ve el nombre de todas, incluida la clienta sin cuenta');

SELECT is(
  (SELECT count(*) FROM public.clients_all_display_names()),
  (SELECT count(*) FROM public.clients_profiles),
  'una fila por perfil: no pagina ni filtra');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000027a2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT client_id FROM public.clients_all_display_names()$$,
  $$VALUES ('00000000-0000-0000-0000-0000000027c2'::uuid)$$,
  'una clienta solo ve su propio nombre: la RLS oculta los de las demás');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT * FROM public.clients_all_display_names()$$, '42501', NULL,
  'un anónimo no ejecuta la función');

RESET ROLE;

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.clients_all_display_names()'::regprocedure),
  false, 'corre con los permisos de quien llama, así que la RLS de los perfiles sigue decidiendo');

SELECT is(
  (SELECT array_agg(a ORDER BY a) FROM unnest(
     (SELECT proargnames FROM pg_proc WHERE oid = 'public.clients_all_display_names()'::regprocedure)) a),
  ARRAY['client_id', 'full_name']::text[],
  'solo devuelve el id y el nombre: sin teléfono ni correo');

SELECT * FROM finish();
ROLLBACK;
