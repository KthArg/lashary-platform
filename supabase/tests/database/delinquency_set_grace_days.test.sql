-- delinquency_set_grace_days.test.sql
-- US-MOR-01 · la administradora cambia el periodo de gracia (criterio 2, DOM-011, DOM-012, SEC-001).
-- Solo admin; de 1 a 90 días; cada cambio deja su evento con el valor anterior y el nuevo; poner el mismo valor
-- no deja evento; rige solo para las detecciones nuevas (no toca una morosidad ya generada); la clienta y anon
-- no la llaman. Todo se deshace con ROLLBACK.
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'gracia-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'gracia-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000000f1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-00000000ff01', '00000000-0000-0000-0000-0000000000f2',
        'Clienta de la gracia', 'gracia-clienta@test.local', '00000000050');

-- Una morosidad ya generada con la gracia de 7 días: cambiar la gracia no debe tocarla.
INSERT INTO public.delinquency_cases (id, client_id, appointment_id, pending, detected_at)
VALUES ('00000000-0000-0000-0000-00000000fc01', '00000000-0000-0000-0000-00000000ff01',
        '00000000-0000-0000-0000-00000000fa01', 20000, now() - interval '3 days');

-- ── Como admin ─────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  public.delinquency_set_grace_days(14),
  14, 'la administradora cambia la gracia y la función devuelve el valor que quedó');

SELECT is(
  (SELECT grace_days FROM public.delinquency_settings),
  14, 'la gracia quedó en 14 días');

SELECT results_eq(
  $$SELECT actor_id, entity_type, payload FROM public.audit_events
     WHERE action = 'delinquency.settings.grace_days_changed'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000f1'::uuid, 'delinquency_settings'::text,
            '{"graceDays": 14, "previousGraceDays": 7}'::jsonb)$$,
  'el cambio deja su evento en la bitácora con quién, el valor anterior y el nuevo');

SELECT is(
  (SELECT entity_id FROM public.audit_events WHERE action = 'delinquency.settings.grace_days_changed'),
  (SELECT id FROM public.delinquency_settings),
  'el evento queda sobre la configuración');

SELECT is(
  public.delinquency_set_grace_days(14),
  14, 'poner el mismo valor devuelve el valor');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events WHERE action = 'delinquency.settings.grace_days_changed'),
  1, 'y no deja otro evento: no cambió nada');

SELECT lives_ok($$SELECT public.delinquency_set_grace_days(1)$$, 'la gracia puede bajar a 1 día');
SELECT lives_ok($$SELECT public.delinquency_set_grace_days(90)$$, 'y subir a 90 días');

SELECT throws_ok(
  $$SELECT public.delinquency_set_grace_days(0)$$,
  '22023', 'delinquency_invalid_grace_days', 'la gracia no baja de 1 día');

SELECT throws_ok(
  $$SELECT public.delinquency_set_grace_days(91)$$,
  '22023', 'delinquency_invalid_grace_days', 'la gracia no pasa de 90 días');

SELECT is(
  (SELECT state FROM public.delinquency_cases WHERE id = '00000000-0000-0000-0000-00000000fc01'),
  'pending_review', 'cambiar la gracia no toca una morosidad ya generada');

-- ── Como la clienta ────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.delinquency_set_grace_days(30)$$,
  '42501', 'delinquency_not_admin', 'la clienta no puede cambiar la gracia');

-- ── Como anon ──────────────────────────────────────────────────────────────────
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.delinquency_set_grace_days(30)$$,
  '42501', NULL, 'anon no tiene permiso para llamar la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
