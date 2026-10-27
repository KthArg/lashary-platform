-- scheduling_reductions_reject_appointments.test.sql — US-AGE-07, criterio 4 (SEC-001, SEC-002, DOM-010).
-- Cerrar un día y quitar un bloque semanal con citas activas se rechazan en la base.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000a0aa1', 'scheduling-reductions-admin@test.local'),
  ('00000000-0000-0000-0000-0000000a0ac1', 'scheduling-reductions-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000a0aa1';

INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-4000-8000-0000000a0af1', 'zz-test recurso reducciones');

CREATE TEMP TABLE next_week AS
  SELECT (date_trunc('week', now() AT TIME ZONE 'America/Costa_Rica')::date + 7) AS monday;
GRANT SELECT ON next_week TO authenticated;

INSERT INTO public.scheduling_weekly_availability (id, resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-4000-8000-0000000a0ab1', '00000000-0000-4000-8000-0000000a0af1', 1, 480, 720),
  ('00000000-0000-4000-8000-0000000a0ab2', '00000000-0000-4000-8000-0000000a0af1', 2, 480, 720),
  ('00000000-0000-4000-8000-0000000a0ab3', '00000000-0000-4000-8000-0000000a0af1', 4, 1200, 1440);

-- Lunes 10:00-11:00 y jueves 23:15-23:45 (su espacio ocupado llega justo a medianoche).
INSERT INTO public.scheduling_appointments (id, resource_id, status, starts_at, ends_at, occupied_range)
SELECT '00000000-0000-4000-8000-0000000a0ae1', '00000000-0000-4000-8000-0000000a0af1', 'pending_approval',
       (monday + time '10:00') AT TIME ZONE 'America/Costa_Rica',
       (monday + time '11:00') AT TIME ZONE 'America/Costa_Rica',
       tstzrange((monday + time '10:00') AT TIME ZONE 'America/Costa_Rica',
                 (monday + time '11:15') AT TIME ZONE 'America/Costa_Rica')
  FROM next_week;

INSERT INTO public.scheduling_appointments (id, resource_id, status, starts_at, ends_at, occupied_range)
SELECT '00000000-0000-4000-8000-0000000a0ae2', '00000000-0000-4000-8000-0000000a0af1', 'pending_approval',
       ((monday + 3) + time '23:15') AT TIME ZONE 'America/Costa_Rica',
       ((monday + 3) + time '23:45') AT TIME ZONE 'America/Costa_Rica',
       tstzrange(((monday + 3) + time '23:15') AT TIME ZONE 'America/Costa_Rica',
                 (monday + 4)::timestamp AT TIME ZONE 'America/Costa_Rica')
  FROM next_week;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000a0aa1","role":"authenticated"}', true);

SELECT throws_ok(
  $$DELETE FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000a0ab1'$$,
  '23514', 'scheduling_weekly_availability_active_appointments',
  'admin: quitar un bloque semanal con una cita futura se rechaza');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000a0ab1'),
  1, 'admin: el bloque rechazado sigue ahí');

SELECT lives_ok(
  $$DELETE FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000a0ab2'$$,
  'admin: quitar un bloque semanal sin citas se acepta');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000a0ab2'),
  0, 'admin: el bloque sin citas se quitó');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    SELECT '00000000-0000-4000-8000-0000000a0af1', monday, 'holiday' FROM next_week$$,
  '23514', 'scheduling_closed_dates_active_appointment',
  'admin: cerrar un día con una cita activa se rechaza');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    SELECT '00000000-0000-4000-8000-0000000a0af1', monday + 3, 'holiday' FROM next_week$$,
  '23514', 'scheduling_closed_dates_active_appointment',
  'admin: una cita de las 23:15 cuenta para su día, hora del estudio');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    SELECT '00000000-0000-4000-8000-0000000a0af1', monday + 4, 'holiday' FROM next_week$$,
  'admin: el día siguiente a esa cita, que termina a medianoche, se puede cerrar');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    SELECT '00000000-0000-4000-8000-0000000a0af1', monday + 2, 'non_working' FROM next_week$$,
  'admin: cerrar un día sin citas se acepta');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-4000-8000-0000000a0af1'),
  2, 'admin: solo quedaron cerrados los dos días sin citas');

SELECT lives_ok(
  $$SELECT * FROM public.scheduling_decide_appointment('00000000-0000-4000-8000-0000000a0ae1', 'rejected', NULL)$$,
  'admin: resuelve la cita del lunes rechazándola');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    SELECT '00000000-0000-4000-8000-0000000a0af1', monday, 'holiday' FROM next_week$$,
  'admin: con la cita rechazada, el lunes se puede cerrar');

SELECT lives_ok(
  $$DELETE FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000a0ab1'$$,
  'admin: con la cita rechazada, el bloque del lunes se puede quitar');

SELECT throws_ok(
  $$DELETE FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000a0ab3'$$,
  '23514', 'scheduling_weekly_availability_active_appointments',
  'admin: el bloque del jueves, con la cita de las 23:15 dentro, se rechaza');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000a0ac1","role":"authenticated"}', true);

SELECT throws_ok(
  $$INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
    SELECT '00000000-0000-4000-8000-0000000a0af1', monday + 3, 'holiday' FROM next_week$$,
  '42501', NULL,
  'clienta: cerrar un día choca con RLS, no con el trigger que revela las citas (SEC-001)');

SELECT lives_ok(
  $$DELETE FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000a0ab3'$$,
  'clienta: su DELETE no encuentra filas por RLS y no recibe ningún error que revele citas');

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.scheduling_weekly_availability WHERE id = '00000000-0000-4000-8000-0000000a0ab3'),
  1, 'clienta: no quitó el bloque (SEC-001)');

SELECT * FROM finish();
ROLLBACK;
