-- US-AGE-10 · pregunta 4 al PO: un reagendado que nadie decide a tiempo vuelve solo al horario aprobado.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000008e1', 'expire-admin@test.local'),
  ('00000000-0000-0000-0000-0000000008e2', 'expire-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000008e1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000008c1', '00000000-0000-0000-0000-0000000008e2',
        'Clienta', 'expire-clienta@test.local', '+50688880121');

-- 8a01: horario aprobado dentro de 20 h (el plazo de 24 h antes ya pasó), horario nuevo lejos: vence.
-- 8a02: horario aprobado dentro de 30 h (el plazo vence en 6 h): sigue esperando.
-- 8a03: horario aprobado dentro de 5 días, pero el horario nuevo pedido empezó hace 10 minutos: vence.
-- 8a04: pendiente sin horario guardado, dentro de 3 h: no es un reagendado, no se toca.
-- 8a05: horario aprobado dentro de 22 h, pero estaba confirmada: vuelve a confirmada.
INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, reschedule_count,
   previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
SELECT ('00000000-0000-0000-0000-000000008a0' || n)::uuid, '00000000-0000-0000-0000-000000000a01', 'pending_approval',
       new_start, new_start + interval '1 hour', tstzrange(new_start, new_start + interval '1 hour 15 minutes'),
       '00000000-0000-0000-0000-0000000008c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test vencer',
       true, 35000, 10000, 10000, 1,
       held_start, held_start + interval '1 hour', tstzrange(held_start, held_start + interval '1 hour 15 minutes'),
       held_status
  FROM (VALUES
          (1, '2041-09-01 10:00+00'::timestamptz, date_trunc('minute', now()) + interval '20 hours', 'approved'),
          (2, '2041-09-02 10:00+00'::timestamptz, date_trunc('minute', now()) + interval '30 hours', 'approved'),
          (3, date_trunc('minute', now()) - interval '10 minutes', date_trunc('minute', now()) + interval '5 days', 'approved'),
          (5, '2041-09-05 10:00+00'::timestamptz, date_trunc('minute', now()) + interval '22 hours', 'confirmed')
       ) AS seed(n, new_start, held_start, held_status);

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required)
VALUES ('00000000-0000-0000-0000-000000008a04', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
        date_trunc('minute', now()) + interval '3 hours', date_trunc('minute', now()) + interval '4 hours',
        tstzrange(date_trunc('minute', now()) + interval '3 hours', date_trunc('minute', now()) + interval '4 hours 15 minutes'),
        '00000000-0000-0000-0000-0000000008c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test vencer',
        true, 35000, 10000);

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e2","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_expire_undecided_reschedules()$$,
  '42501', NULL, 'una clienta no puede vencer reagendados');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008e1","role":"authenticated"}', true);

SELECT is(public.scheduling_expire_undecided_reschedules(), 3,
  'staff: vence los tres reagendados cuyo plazo pasó');

RESET ROLE;

SELECT results_eq(
  $$SELECT status, starts_at, previous_status, decided_by
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000008a01'$$,
  $$VALUES ('approved'::text, date_trunc('minute', now()) + interval '20 hours', NULL::text,
            '00000000-0000-0000-0000-0000000008e1'::uuid)$$,
  'vencido 24 h antes: la cita vuelve aprobada a su horario, sin horario guardado');

SELECT results_eq(
  $$SELECT deposit_registered, reschedule_count
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000008a01'$$,
  $$VALUES (10000::bigint, 1)$$,
  'vencido: el anticipo se conserva y el intento sigue contado');

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000008a02'),
  'pending_approval', 'con el plazo todavía abierto, el reagendado sigue esperando');

SELECT results_eq(
  $$SELECT status, starts_at FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000008a03'$$,
  $$VALUES ('approved'::text, date_trunc('minute', now()) + interval '5 days')$$,
  'si llega el horario nuevo sin decisión, también vence aunque falten días para el aprobado');

SELECT is(
  (SELECT status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000008a05'),
  'confirmed', 'una cita que estaba confirmada vuelve a confirmada');

SELECT results_eq(
  $$SELECT status, previous_status FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000008a04'$$,
  $$VALUES ('pending_approval'::text, NULL::text)$$,
  'una pendiente que no es un reagendado no se toca, aunque esté cerca');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-09-01 10:00+00', '2041-09-01 11:00+00',
            tstzrange('2041-09-01 10:00+00', '2041-09-01 11:15+00'))$$,
  'el horario nuevo de un reagendado vencido queda libre');

SELECT results_eq(
  $$SELECT payload - 'deadline' FROM public.audit_events
     WHERE action = 'scheduling.appointment.reschedule_expired'
       AND entity_id = '00000000-0000-0000-0000-000000008a01'$$,
  $$VALUES (jsonb_build_object(
      'expiredStartsAt', '2041-09-01 10:00+00'::timestamptz,
      'restoredStartsAt', date_trunc('minute', now()) + interval '20 hours',
      'restoredStatus', 'approved'))$$,
  'el evento de vencimiento trae el horario vencido y el devuelto');

SELECT is(
  (SELECT (payload ->> 'deadline')::timestamptz FROM public.audit_events
    WHERE action = 'scheduling.appointment.reschedule_expired'
      AND entity_id = '00000000-0000-0000-0000-000000008a03'),
  date_trunc('minute', now()) - interval '10 minutes',
  'el plazo es lo primero que llega: aquí, el inicio del horario nuevo');

SELECT is(
  (SELECT count(*) FROM public.audit_events
    WHERE action = 'scheduling.appointment.reschedule_reverted'
      AND entity_id IN ('00000000-0000-0000-0000-000000008a01', '00000000-0000-0000-0000-000000008a03',
                        '00000000-0000-0000-0000-000000008a05')),
  3::bigint, 'cada vencimiento deja también el evento de cita devuelta a su horario');

SET LOCAL ROLE authenticated;

SELECT is(public.scheduling_expire_undecided_reschedules(), 0,
  'una segunda corrida no encuentra nada que vencer');

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.scheduling_expire_undecided_reschedules()$$,
  '42501', NULL, 'anon: no tiene permiso para ejecutar la función');

SELECT * FROM finish();
ROLLBACK;
