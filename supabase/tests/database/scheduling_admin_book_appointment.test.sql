-- scheduling_admin_book_appointment.test.sql
-- US-MOR-02 · scheduling — la administradora agenda en nombre de una clienta y puede autorizar la excepción
-- cuando está bloqueada por una morosidad (criterio 4; DOM-011, DOM-012). Solo la llama una administradora;
-- la cita queda a nombre de la clienta del parámetro. Si la clienta está bloqueada y no hay autorización,
-- devuelve id nulo y registra el bloqueo. Con autorización exige un motivo de al menos 10 caracteres, agenda,
-- y deja el evento con la administradora, la clienta, la cita y el motivo, que la clienta no ve. Si la
-- clienta no está bloqueada la autorización no hace nada.
-- Lunes de prueba: 2027-09-06 (abierto 09:00–12:00 y 12:00–17:00). Hora de Costa Rica, UTC-6.
-- Los asientos se escriben por payments_record_close_entries; todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000010a1', 'admin-book-admin@test.local'),
  ('00000000-0000-0000-0000-0000000010a2', 'admin-book-morosa@test.local'),
  ('00000000-0000-0000-0000-0000000010a3', 'admin-book-limpia@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000010a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-0000000010a2', 'Clienta morosa', 'admin-book-morosa@test.local', '+50688883002'),
  ('00000000-0000-0000-0000-0000000010c3', '00000000-0000-0000-0000-0000000010a3', 'Clienta limpia', 'admin-book-limpia@test.local', '+50688883003');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min,
   buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000010f4', 'zz-test admin agenda', 'lash_classic',
   35000, 25000, 60, 45, 15, 0, 'cuidados', true);

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 1, 540, 720),
  ('00000000-0000-0000-0000-000000000a01', 1, 720, 1020);

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000010a1","role":"authenticated"}', true);

-- La morosa debe 25000 de la cita a0e1 (confirmada).
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-00000000a0e1', 25000, 0);
INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES ('00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-00000000a0e1', 25000, 'active',
        now() - interval '5 days', now(), '00000000-0000-0000-0000-0000000010a1');

-- ── La clienta no puede usarla ─────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000010a3","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_admin_book_appointment(
      '00000000-0000-0000-0000-0000000010c3', '00000000-0000-0000-0000-000000000a01',
      '2027-09-06 09:00-06', '00000000-0000-0000-0000-0000000010f4', true)$$,
  '42501', 'scheduling_not_authorized', 'una clienta no puede agendar por otra con la función de la administradora');

-- ── La administradora agenda por una clienta sin morosidad ─────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000010a1","role":"authenticated"}', true);

CREATE TEMP TABLE booked_clean AS
  SELECT * FROM public.scheduling_admin_book_appointment(
    '00000000-0000-0000-0000-0000000010c3', '00000000-0000-0000-0000-000000000a01',
    '2027-09-06 09:00-06', '00000000-0000-0000-0000-0000000010f4', true);

SELECT is((SELECT client_id FROM booked_clean), '00000000-0000-0000-0000-0000000010c3'::uuid,
  'la cita queda a nombre de la clienta del parámetro, no de la administradora');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_admin_book_appointment(
      '00000000-0000-0000-0000-0000000010ff', '00000000-0000-0000-0000-000000000a01',
      '2027-09-06 10:30-06', '00000000-0000-0000-0000-0000000010f4', true)$$,
  'P0001', 'scheduling_client_not_registered', 'una clienta que no existe se rechaza');

-- ── Clienta bloqueada, sin autorización ────────────────────────────────────────
SELECT is(
  (SELECT id FROM public.scheduling_admin_book_appointment(
     '00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-000000000a01',
     '2027-09-06 12:00-06', '00000000-0000-0000-0000-0000000010f4', true)),
  NULL::uuid, 'la misma regla rige a la administradora: bloqueada y sin autorización, id nulo');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments WHERE client_id = '00000000-0000-0000-0000-0000000010c2'),
  0, 'el bloqueo no crea ninguna cita');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events
    WHERE action = 'scheduling.booking.blocked_by_delinquency'
      AND entity_id = '00000000-0000-0000-0000-0000000010c2'
      AND actor_id = '00000000-0000-0000-0000-0000000010a1'),
  1, 'el bloqueo se registra con la administradora como actor');

-- ── Con autorización: motivo obligatorio ───────────────────────────────────────
SELECT throws_ok(
  $$SELECT * FROM public.scheduling_admin_book_appointment(
      '00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-000000000a01',
      '2027-09-06 12:00-06', '00000000-0000-0000-0000-0000000010f4', true, NULL, true, NULL)$$,
  '22023', 'scheduling_exception_reason_required', 'autorizar sin motivo se rechaza');

SELECT throws_ok(
  $$SELECT * FROM public.scheduling_admin_book_appointment(
      '00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-000000000a01',
      '2027-09-06 12:00-06', '00000000-0000-0000-0000-0000000010f4', true, NULL, true, '   corto  ')$$,
  '22023', 'scheduling_exception_reason_required', 'un motivo de menos de 10 caracteres (sin contar espacios) se rechaza');

CREATE TEMP TABLE booked_exception AS
  SELECT * FROM public.scheduling_admin_book_appointment(
    '00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-000000000a01',
    '2027-09-06 12:00-06', '00000000-0000-0000-0000-0000000010f4', true, NULL, true,
    'La clienta pagará en efectivo al llegar');

SELECT is((SELECT client_id FROM booked_exception), '00000000-0000-0000-0000-0000000010c2'::uuid,
  'con autorización y motivo se agenda, a nombre de la clienta bloqueada');

SELECT is(
  (SELECT entity_id FROM public.audit_events
    WHERE action = 'scheduling.booking.block_exception_authorized'),
  (SELECT id FROM booked_exception), 'el evento de la excepción es sobre la cita creada');

SELECT is(
  (SELECT actor_id::text || '|' || (payload ->> 'clientId') || '|' || (payload ->> 'reason')
     || '|' || (payload #>> '{blockingAppointments,0,pending}')
     FROM public.audit_events WHERE action = 'scheduling.booking.block_exception_authorized'),
  '00000000-0000-0000-0000-0000000010a1|00000000-0000-0000-0000-0000000010c2|La clienta pagará en efectivo al llegar|25000',
  'el evento guarda quién la autorizó, la clienta, el motivo y lo que debía');

-- Autorizar a una clienta que no está bloqueada no deja evento ni pide motivo.
SELECT isnt(
  (SELECT id FROM public.scheduling_admin_book_appointment(
     '00000000-0000-0000-0000-0000000010c3', '00000000-0000-0000-0000-000000000a01',
     '2027-09-06 14:00-06', '00000000-0000-0000-0000-0000000010f4', true, NULL, true, NULL)),
  NULL::uuid, 'autorizar a una clienta que no está bloqueada agenda normal, sin pedir motivo');

SELECT is(
  (SELECT count(*)::int FROM public.audit_events WHERE action = 'scheduling.booking.block_exception_authorized'),
  1, 'y no deja un evento de excepción que no se usó');

-- ── La clienta no ve la excepción ──────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000010a2","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*)::int FROM public.audit_events),
  0, 'la clienta bloqueada no ve ningún evento de la bitácora, ni el de su excepción');

SELECT * FROM finish();
ROLLBACK;
