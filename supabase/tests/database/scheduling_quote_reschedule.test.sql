-- US-AGE-10 · lo que se le muestra a la clienta antes de reagendar, sin escribir nada.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(13);

CREATE TEMP TABLE audit_events_before AS SELECT count(*) AS total FROM public.audit_events;

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000b12', 'quote-resched-a@test.local'),
  ('00000000-0000-0000-0000-000000000b13', 'quote-resched-b@test.local'),
  ('00000000-0000-0000-0000-000000000b14', 'quote-resched-sin-perfil@test.local');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-000000000bd6', '00000000-0000-0000-0000-000000000b12',
   'Clienta A', 'quote-resched-a@test.local', '+50688880091'),
  ('00000000-0000-0000-0000-000000000bd7', '00000000-0000-0000-0000-000000000b13',
   'Clienta B', 'quote-resched-b@test.local', '+50688880092');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, reschedule_count)
VALUES
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-000000000a01', 'approved',
   (now() + interval '30 days'), (now() + interval '30 days 1 hour'),
   tstzrange((now() + interval '30 days'), (now() + interval '30 days 1 hour 15 minutes')),
   '00000000-0000-0000-0000-000000000bd6', '00000000-0000-0000-0000-000000000bf5', 'zz-test cotizar reagendar',
   true, 35000, 10000, 10000, 0),
  ('00000000-0000-0000-0000-00000000bb02', '00000000-0000-0000-0000-000000000a01', 'approved',
   now() + interval '10 hours', now() + interval '11 hours',
   tstzrange(now() + interval '10 hours', now() + interval '11 hours 15 minutes'),
   '00000000-0000-0000-0000-000000000bd6', '00000000-0000-0000-0000-000000000bf5', 'zz-test cotizar reagendar',
   true, 35000, 10000, 10000, 0),
  ('00000000-0000-0000-0000-00000000bb03', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   now() + interval '13 hours', now() + interval '14 hours',
   tstzrange(now() + interval '13 hours', now() + interval '14 hours 15 minutes'),
   '00000000-0000-0000-0000-000000000bd6', '00000000-0000-0000-0000-000000000bf5', 'zz-test cotizar reagendar',
   true, 35000, 10000, 10000, 0),
  ('00000000-0000-0000-0000-00000000bb04', '00000000-0000-0000-0000-000000000a01', 'approved',
   (now() + interval '31 days'), (now() + interval '31 days 1 hour'),
   tstzrange((now() + interval '31 days'), (now() + interval '31 days 1 hour 15 minutes')),
   '00000000-0000-0000-0000-000000000bd7', '00000000-0000-0000-0000-000000000bf5', 'zz-test cotizar reagendar',
   true, 35000, 10000, 10000, 0),
  ('00000000-0000-0000-0000-00000000bb05', '00000000-0000-0000-0000-000000000a01', 'rejected',
   (now() + interval '32 days'), (now() + interval '32 days 1 hour'),
   tstzrange((now() + interval '32 days'), (now() + interval '32 days 1 hour 15 minutes')),
   '00000000-0000-0000-0000-000000000bd6', '00000000-0000-0000-0000-000000000bf5', 'zz-test cotizar reagendar',
   true, 35000, 10000, 10000, 0),
  ('00000000-0000-0000-0000-00000000bb06', '00000000-0000-0000-0000-000000000a01', 'approved',
   (now() + interval '33 days'), (now() + interval '33 days 1 hour'),
   tstzrange((now() + interval '33 days'), (now() + interval '33 days 1 hour 15 minutes')),
   '00000000-0000-0000-0000-000000000bd6', '00000000-0000-0000-0000-000000000bf5', 'zz-test cotizar reagendar',
   true, 35000, 10000, 10000, 1);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b12","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT technique_name, status, occupied_minutes, reschedule_count, max_reschedules, window_hours, blocked_by
      FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb01')$$,
  $$VALUES ('zz-test cotizar reagendar'::text, 'approved'::text, 75, 0, 1, 48, NULL::text)$$,
  'una cita aprobada con tiempo se puede reagendar: trae el espacio que ocupa con la limpieza y el tope');

SELECT results_eq(
  $$SELECT ends_at - starts_at FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb01')$$,
  $$VALUES (interval '1 hour')$$,
  'y la duración del servicio');

SELECT is(
  (SELECT blocked_by FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb02')),
  'outside_window', 'una cita aprobada con menos horas que la ventana dice que está fuera de la ventana');

SELECT is(
  (SELECT blocked_by FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb03')),
  NULL::text, 'una cita pendiente con pocas horas se puede reagendar: sin ventana');

SELECT is(
  (SELECT blocked_by FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb06')),
  'limit_reached', 'una cita que ya se reagendó el máximo dice que llegó al tope');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb04')$$,
  'P0001', 'scheduling_appointment_not_reschedulable', 'la cita de otra clienta no se cotiza');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb05')$$,
  'P0001', 'scheduling_appointment_not_reschedulable', 'una cita rechazada no se cotiza');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb99')$$,
  'P0001', 'scheduling_appointment_not_reschedulable', 'una cita que no existe da el mismo error que una ajena');

RESET ROLE;
UPDATE public.scheduling_reschedule_policy SET max_reschedules = 2;
UPDATE public.scheduling_cancellation_policy SET cancellation_window_hours = 5;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b12","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT blocked_by, max_reschedules, window_hours
      FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb02')$$,
  $$VALUES (NULL::text, 2, 5)$$,
  'con una ventana de 5 horas, la cita que falta 10 horas ya está dentro de la ventana y se puede mover');

SELECT is(
  (SELECT blocked_by FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb06')),
  NULL::text, 'con un tope de 2, la cita con un reagendado todavía se puede mover');

RESET ROLE;

SELECT is((SELECT count(*) FROM public.audit_events), (SELECT total FROM audit_events_before),
  'cotizar no escribe nada en la bitácora');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b14","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb01')$$,
  'P0001', 'scheduling_client_not_registered', 'una usuaria sin perfil de clienta no cotiza');

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-00000000bb01')$$,
  '42501', NULL, 'un anónimo no ejecuta la función');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
