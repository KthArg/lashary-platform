-- US-AGE-10 · hallazgo A2: con un reagendado esperando decisión, cancelar y cotizar miden la ventana
-- contra el horario aprobado que la cita guarda.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000007e1', 'held-cancel@test.local');

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-0000000007e1',
        'Clienta', 'held-cancel@test.local', '+50688880111');

UPDATE public.scheduling_reschedule_policy SET max_reschedules = 3;

-- 7a01: reagendada lejos, con el horario aprobado guardado dentro de 10 h (fuera de la ventana).
-- 7a02: reagendada, con el horario aprobado guardado lejos. 7a03: pendiente sin nada guardado, dentro de 10 h.
INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, reschedule_count,
   previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
VALUES
  ('00000000-0000-0000-0000-000000007a01', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2041-08-01 10:00+00', '2041-08-01 11:00+00', tstzrange('2041-08-01 10:00+00', '2041-08-01 11:15+00'),
   '00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test cancelar',
   true, 35000, 10000, 10000, 1,
   now() + interval '10 hours', now() + interval '11 hours',
   tstzrange(now() + interval '10 hours', now() + interval '11 hours 15 minutes'), 'approved'),
  ('00000000-0000-0000-0000-000000007a02', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
   '2041-08-02 10:00+00', '2041-08-02 11:00+00', tstzrange('2041-08-02 10:00+00', '2041-08-02 11:15+00'),
   '00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test cancelar',
   true, 35000, 10000, 10000, 1,
   '2041-07-02 10:00+00', '2041-07-02 11:00+00', tstzrange('2041-07-02 10:00+00', '2041-07-02 11:15+00'),
   'approved');

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered)
VALUES ('00000000-0000-0000-0000-000000007a03', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
        now() + interval '12 hours', now() + interval '13 hours',
        tstzrange(now() + interval '12 hours', now() + interval '13 hours 15 minutes'),
        '00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test cancelar',
        true, 35000, 10000, 10000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007e1","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-000000007a01')$$,
  $$VALUES (false, 10000::bigint)$$,
  'cotizar: con el horario aprobado guardado cerca, cancelar pierde el anticipo aunque el nuevo esté lejos');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-000000007a02')$$,
  $$VALUES (true, 0::bigint)$$,
  'cotizar: con el horario guardado lejos, cancelar no pierde nada');

SELECT is(
  (SELECT blocked_by FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-000000007a01')),
  'outside_window', 'cotizar reagendado: el bloqueo por ventana sale del horario guardado');

SELECT is(
  (SELECT blocked_by FROM public.scheduling_quote_reschedule('00000000-0000-0000-0000-000000007a02')),
  NULL, 'cotizar reagendado: con el horario guardado lejos, se puede reagendar');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-000000007a01', 0)$$,
  'P0001', 'scheduling_cancellation_consequence_changed',
  'cancelar: no se cancela creyendo que no pierde nada');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_cancel_appointment('00000000-0000-0000-0000-000000007a01', 10000)$$,
  $$VALUES (false, 10000::bigint)$$,
  'cancelar: pierde el anticipo, como si cancelara el horario aprobado');

SELECT results_eq(
  $$SELECT within_window, forfeited_deposit
      FROM public.scheduling_quote_cancellation('00000000-0000-0000-0000-000000007a03')$$,
  $$VALUES (false, 0::bigint)$$,
  'sin horario guardado, una pendiente cerca se cancela como siempre: sin perder nada');

RESET ROLE;

SELECT results_eq(
  $$SELECT status, previous_status FROM public.scheduling_appointments
     WHERE id = '00000000-0000-0000-0000-000000007a01'$$,
  $$VALUES ('cancelled'::text, NULL::text)$$,
  'cancelar: la cita queda cancelada y suelta el horario guardado');

SELECT ok(
  (SELECT payload ->> 'heldStartsAt' FROM public.audit_events
    WHERE action = 'scheduling.appointment.cancelled' AND entity_id = '00000000-0000-0000-0000-000000007a01') IS NOT NULL,
  'cancelar: el evento trae el inicio guardado');

SELECT * FROM finish();
ROLLBACK;
