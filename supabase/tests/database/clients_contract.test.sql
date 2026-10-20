-- US-AGE-05 · contrato SQL de clients: el perfil de la sesión y los nombres de las clientas.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000009e2', 'contract-a@test.local'),
  ('00000000-0000-0000-0000-0000000009e3', 'contract-b@test.local'),
  ('00000000-0000-0000-0000-0000000009e4', 'contract-sin-perfil@test.local'),
  ('00000000-0000-0000-0000-0000000009e5', 'contract-admin@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000009e5';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000009c6', '00000000-0000-0000-0000-0000000009e2',
   'Clienta A', 'contract-a@test.local', '+50688880046'),
  ('00000000-0000-0000-0000-0000000009c7', '00000000-0000-0000-0000-0000000009e3',
   'Clienta B', 'contract-b@test.local', '+50688880047'),
  ('00000000-0000-0000-0000-0000000009c8', NULL,
   'Clienta sin cuenta', 'contract-c@test.local', '+50688880048');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009e2","role":"authenticated"}', true);

SELECT is(public.clients_current_profile_id(), '00000000-0000-0000-0000-0000000009c6'::uuid,
  'el perfil de la sesión es el de la clienta que llama, sin recibir ningún parámetro');

SELECT results_eq(
  $$SELECT client_id, full_name FROM public.clients_display_names(
      ARRAY['00000000-0000-0000-0000-0000000009c6', '00000000-0000-0000-0000-0000000009c7']::uuid[])$$,
  $$VALUES ('00000000-0000-0000-0000-0000000009c6'::uuid, 'Clienta A'::text)$$,
  'una clienta solo obtiene su propio nombre: la RLS oculta los perfiles de las demás');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009e4","role":"authenticated"}', true);

SELECT is(public.clients_current_profile_id(), NULL::uuid,
  'una sesión sin perfil de clienta recibe nulo');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009e5","role":"authenticated"}', true);

SELECT is(public.clients_current_profile_id(), NULL::uuid,
  'una administradora sin perfil de clienta propio recibe nulo, no el de otra');

SELECT results_eq(
  $$SELECT client_id, full_name FROM public.clients_display_names(
      ARRAY['00000000-0000-0000-0000-0000000009c6', '00000000-0000-0000-0000-0000000009c7',
            '00000000-0000-0000-0000-0000000009c8']::uuid[]) ORDER BY full_name$$,
  $$VALUES ('00000000-0000-0000-0000-0000000009c6'::uuid, 'Clienta A'::text),
           ('00000000-0000-0000-0000-0000000009c7'::uuid, 'Clienta B'::text),
           ('00000000-0000-0000-0000-0000000009c8'::uuid, 'Clienta sin cuenta'::text)$$,
  'una administradora obtiene los nombres de todas, incluida la clienta sin cuenta');

SELECT is(
  (SELECT count(*) FROM public.clients_display_names(
     ARRAY['00000000-0000-0000-0000-00000000dead']::uuid[])),
  0::bigint, 'un id que no existe no devuelve fila');

SELECT is(
  (SELECT count(*) FROM public.clients_display_names(ARRAY[]::uuid[])),
  0::bigint, 'una lista vacía no devuelve filas');

SELECT is(
  (SELECT count(*) FROM public.clients_display_names(NULL)),
  0::bigint, 'un argumento nulo no devuelve filas');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok($$SELECT public.clients_current_profile_id()$$, '42501', NULL,
  'un anónimo no ejecuta el perfil de la sesión');

SELECT throws_ok(
  $$SELECT * FROM public.clients_display_names(ARRAY['00000000-0000-0000-0000-0000000009c6']::uuid[])$$,
  '42501', NULL, 'un anónimo no ejecuta la consulta de nombres');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
