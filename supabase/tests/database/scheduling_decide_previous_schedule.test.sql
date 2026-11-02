-- US-AGE-10 · hallazgo A2: aprobar un reagendado suelta el horario guardado, rechazarlo devuelve la cita
-- a ese horario y cancelarla suelta los dos.
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000003e1', 'settle-admin@test.local'),
  ('00000000-0000-0000-0000-0000000003e2', 'settle-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000003e1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000003c1', '00000000-0000-0000-0000-0000000003e2',
        'Clienta', 'settle-clienta@test.local', '+50688880091');

-- Cada cita fue reagendada: espera decisión en el horario nuevo (día 2X a las 10:00) y guarda el aprobado
-- (día 1X a las 10:00). 3b03 estaba confirmada. 3b06 es una pendiente sin nada guardado.
INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required, deposit_registered, reschedule_count,
   previous_starts_at, previous_ends_at, previous_occupied_range, previous_status)
SELECT ('00000000-0000-0000-0000-000000003b0' || n)::uuid, '00000000-0000-0000-0000-000000000a01',
       'pending_approval',
       format('2041-06-2%s 10:00+00', n)::timestamptz, format('2041-06-2%s 11:00+00', n)::timestamptz,
       tstzrange(format('2041-06-2%s 10:00+00', n)::timestamptz, format('2041-06-2%s 11:15+00', n)::timestamptz),
       '00000000-0000-0000-0000-0000000003c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test decidir',
       true, 35000, 10000, 10000, 1,
       format('2041-06-1%s 10:00+00', n)::timestamptz, format('2041-06-1%s 11:00+00', n)::timestamptz,
       tstzrange(format('2041-06-1%s 10:00+00', n)::timestamptz, format('2041-06-1%s 11:15+00', n)::timestamptz),
       CASE WHEN n = 3 THEN 'confirmed' ELSE 'approved' END
  FROM generate_series(1, 5) AS n;

INSERT INTO public.scheduling_appointments
  (id, resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
   is_first_time, service_price, deposit_required)
VALUES ('00000000-0000-0000-0000-000000003b06', '00000000-0000-0000-0000-000000000a01', 'pending_approval',
        '2041-06-26 10:00+00', '2041-06-26 11:00+00', tstzrange('2041-06-26 10:00+00', '2041-06-26 11:15+00'),
        '00000000-0000-0000-0000-0000000003c1', '00000000-0000-0000-0000-000000000ef4', 'zz-test decidir',
        true, 35000, 10000);

SET LOCAL ROLE authenticated;

-- ── Clienta ─────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003e2","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_decide_appointment('00000000-0000-0000-0000-000000003b02', 'rejected')),
  0, 'clienta: no decide su propio reagendado');

-- ── Admin ───────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003e1","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_decide_appointment('00000000-0000-0000-0000-000000003b02', 'completed')$$,
  '42501', NULL, 'admin: solo aprueba o rechaza');

SELECT results_eq(
  $$SELECT status, starts_at, previous_status, blocked_ranges
      FROM public.scheduling_decide_appointment(
        '00000000-0000-0000-0000-000000003b01', 'approved', NULL, '2041-06-21 10:00+00')$$,
  $$VALUES ('approved'::text, '2041-06-21 10:00+00'::timestamptz, NULL::text,
            '{["2041-06-21 10:00+00","2041-06-21 11:15+00")}'::tstzmultirange)$$,
  'aprobar: la cita queda en el horario nuevo y suelta el guardado');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-06-11 10:00+00', '2041-06-11 11:00+00',
            tstzrange('2041-06-11 10:00+00', '2041-06-11 11:15+00'))$$,
  'aprobar: el horario que estaba guardado queda libre para otra cita');

SELECT results_eq(
  $$SELECT status, starts_at, ends_at, occupied_range, previous_status, decision_reason, decided_by
      FROM public.scheduling_decide_appointment(
        '00000000-0000-0000-0000-000000003b02', 'rejected', 'no hay técnica ese día')$$,
  $$VALUES ('approved'::text, '2041-06-12 10:00+00'::timestamptz, '2041-06-12 11:00+00'::timestamptz,
            tstzrange('2041-06-12 10:00+00', '2041-06-12 11:15+00'), NULL::text,
            'no hay técnica ese día'::text, '00000000-0000-0000-0000-0000000003e1'::uuid)$$,
  'rechazar: la cita vuelve aprobada a su horario anterior, con el motivo y quién decidió');

SELECT results_eq(
  $$SELECT deposit_registered, service_price, reschedule_count
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000003b02'$$,
  $$VALUES (10000::bigint, 35000::bigint, 1)$$,
  'rechazar: el anticipo y el precio se conservan y el intento sigue contado');

SELECT lives_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-06-22 10:00+00', '2041-06-22 11:00+00',
            tstzrange('2041-06-22 10:00+00', '2041-06-22 11:15+00'))$$,
  'rechazar: el horario nuevo queda libre para otra cita');

SELECT throws_ok(
  $$INSERT INTO public.scheduling_appointments (resource_id, starts_at, ends_at, occupied_range)
    VALUES ('00000000-0000-0000-0000-000000000a01', '2041-06-12 10:00+00', '2041-06-12 11:00+00',
            tstzrange('2041-06-12 10:00+00', '2041-06-12 11:15+00'))$$,
  '23P01', NULL, 'rechazar: el horario devuelto sigue ocupado por la cita');

SELECT results_eq(
  $$SELECT payload FROM public.audit_events
     WHERE action = 'scheduling.appointment.reschedule_reverted'
       AND entity_id = '00000000-0000-0000-0000-000000003b02'$$,
  $$VALUES ('{"rejectedStartsAt": "2041-06-22T10:00:00+00:00", "rejectedEndsAt": "2041-06-22T11:00:00+00:00",
             "restoredStartsAt": "2041-06-12T10:00:00+00:00", "restoredEndsAt": "2041-06-12T11:00:00+00:00",
             "restoredStatus": "approved", "reason": "no hay técnica ese día"}'::jsonb)$$,
  'rechazar: el evento trae el horario rechazado, el devuelto y el motivo');

SELECT is(
  (SELECT actor_id FROM public.audit_events
    WHERE action = 'scheduling.appointment.reschedule_reverted'
      AND entity_id = '00000000-0000-0000-0000-000000003b02'),
  '00000000-0000-0000-0000-0000000003e1'::uuid, 'rechazar: el actor del evento es la administradora');

SELECT is(
  (SELECT status FROM public.scheduling_decide_appointment('00000000-0000-0000-0000-000000003b03', 'rejected')),
  'confirmed', 'rechazar: una cita que estaba confirmada vuelve a confirmada');

UPDATE public.scheduling_appointments SET status = 'rejected'
 WHERE id = '00000000-0000-0000-0000-000000003b05';

SELECT results_eq(
  $$SELECT status, starts_at, previous_status
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000003b05'$$,
  $$VALUES ('approved'::text, '2041-06-15 10:00+00'::timestamptz, NULL::text)$$,
  'rechazar con un UPDATE directo también devuelve la cita a su horario');

SELECT is(
  (SELECT status FROM public.scheduling_decide_appointment('00000000-0000-0000-0000-000000003b06', 'rejected')),
  'rejected', 'una pendiente sin horario guardado se rechaza como siempre');

RESET ROLE;

-- Cancelar (lo hace la función de la clienta, como dueña de la tabla): suelta los dos espacios.
UPDATE public.scheduling_appointments SET status = 'cancelled'
 WHERE id = '00000000-0000-0000-0000-000000003b04';

SELECT results_eq(
  $$SELECT status, starts_at, previous_status
      FROM public.scheduling_appointments WHERE id = '00000000-0000-0000-0000-000000003b04'$$,
  $$VALUES ('cancelled'::text, '2041-06-24 10:00+00'::timestamptz, NULL::text)$$,
  'cancelar: la cita queda cancelada en el horario nuevo, sin horario guardado');

SELECT is(
  (SELECT count(*) FROM public.scheduling_appointments
    WHERE status IN ('pending_approval', 'approved', 'confirmed')
      AND blocked_ranges && tstzmultirange(
        tstzrange('2041-06-14 10:00+00', '2041-06-14 11:15+00'),
        tstzrange('2041-06-24 10:00+00', '2041-06-24 11:15+00'))),
  0::bigint, 'cancelar: los dos espacios quedan libres');

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_decide_appointment('00000000-0000-0000-0000-000000003b06', 'approved')$$,
  '42501', NULL, 'anon: no tiene permiso para ejecutar la función');

SELECT * FROM finish();
ROLLBACK;
