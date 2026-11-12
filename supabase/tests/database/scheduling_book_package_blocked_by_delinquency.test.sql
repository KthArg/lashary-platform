-- scheduling_book_package_blocked_by_delinquency.test.sql
-- US-MOR-02 · scheduling — la reserva de un paquete rechaza a la clienta con una morosidad confirmada que
-- todavía debe, igual que la de una técnica suelta (scheduling_book_blocked_by_delinquency.test.sql):
-- devuelve la fila con id nulo, no crea ninguna cita y deja el evento con el paquete y el monto. Una clienta
-- sin morosidad, con una por revisar, o que ya saldó la cita, agenda normal (criterios 1, 3 y 5; DOM-012).
-- Lunes de prueba: 2027-09-06 (abierto 09:00–12:00 y 12:00–17:00). Hora de Costa Rica, UTC-6.
-- Los asientos se escriben por payments_record_close_entries; todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000009a1', 'bloq-pkg-admin@test.local'),
  ('00000000-0000-0000-0000-0000000009a2', 'bloq-pkg-morosa@test.local'),
  ('00000000-0000-0000-0000-0000000009a3', 'bloq-pkg-limpia@test.local'),
  ('00000000-0000-0000-0000-0000000009a4', 'bloq-pkg-por-revisar@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000009a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES
  ('00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-0000000009a2', 'Clienta paquete morosa', 'bloq-pkg-morosa@test.local', '+50688882002'),
  ('00000000-0000-0000-0000-0000000009c3', '00000000-0000-0000-0000-0000000009a3', 'Clienta paquete limpia', 'bloq-pkg-limpia@test.local', '+50688882003'),
  ('00000000-0000-0000-0000-0000000009c4', '00000000-0000-0000-0000-0000000009a4', 'Clienta paquete por revisar', 'bloq-pkg-por-revisar@test.local', '+50688882004');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000009f1', 'zz-paquete bloqueo técnica 1', 'lash_classic',
   20000, 60, 15, 0, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000009f2', 'zz-paquete bloqueo técnica 2', 'brow_design',
   10000, 30, 5, 0, 'cuidados', true);

INSERT INTO public.catalog_packages (id, name, price, deposit, is_active)
VALUES ('00000000-0000-0000-0000-0000000009d1', 'zz-paquete bloqueo', 25000, 0, true);

INSERT INTO public.catalog_package_techniques (package_id, technique_id) VALUES
  ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009f1'),
  ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009f2');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 1, 540, 720),
  ('00000000-0000-0000-0000-000000000a01', 1, 720, 1020);

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a1","role":"authenticated"}', true);

-- La morosa debe 25000 de la cita a0c1 (confirmada). La clienta por revisar debe 10000 de a0c2, pero su
-- morosidad solo está por revisar.
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-00000000a0c1', 25000, 0);
SELECT public.payments_record_close_entries('00000000-0000-0000-0000-0000000009c4', '00000000-0000-0000-0000-00000000a0c2', 10000, 0);

INSERT INTO public.delinquency_cases (client_id, appointment_id, pending, state, detected_at, decided_at, decided_by)
VALUES
  ('00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-00000000a0c1', 25000, 'active',
   now() - interval '5 days', now(), '00000000-0000-0000-0000-0000000009a1'),
  ('00000000-0000-0000-0000-0000000009c4', '00000000-0000-0000-0000-00000000a0c2', 10000, 'pending_review',
   now() - interval '1 day', NULL, NULL);

-- ── La morosa intenta agendar el paquete ───────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a2","role":"authenticated"}', true);

SELECT is(
  (SELECT id FROM public.scheduling_book_package_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
     '00000000-0000-0000-0000-0000000009d1')),
  NULL::uuid, 'una clienta con una morosidad confirmada que debe recibe la fila con id nulo, sin excepción');

SELECT is(
  (SELECT count(*)::int FROM public.scheduling_appointments WHERE client_id = '00000000-0000-0000-0000-0000000009c2'),
  0, 'el bloqueo no crea ninguna cita');

RESET ROLE;

SELECT is(
  (SELECT payload ->> 'serviceId' || ':' || (payload #>> '{blockingAppointments,0,pending}')
     FROM public.audit_events
    WHERE action = 'scheduling.booking.blocked_by_delinquency'
      AND entity_id = '00000000-0000-0000-0000-0000000009c2'),
  '00000000-0000-0000-0000-0000000009d1:25000',
  'el evento queda en la bitácora con el paquete pedido y el monto que debe');

-- ── Quien no está bloqueada agenda normal ──────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a3","role":"authenticated"}', true);

SELECT isnt(
  (SELECT id FROM public.scheduling_book_package_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00-06',
     '00000000-0000-0000-0000-0000000009d1')),
  NULL::uuid, 'una clienta sin morosidad agenda el paquete normal');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a4","role":"authenticated"}', true);

SELECT isnt(
  (SELECT id FROM public.scheduling_book_package_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 13:00-06',
     '00000000-0000-0000-0000-0000000009d1')),
  NULL::uuid, 'una morosidad por revisar no bloquea: solo la confirmada tiene consecuencias (DOM-012)');

-- ── Al saldar la cita, la morosa recupera el acceso sola ───────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a1","role":"authenticated"}', true);
INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount)
VALUES ('00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-00000000a0c1', 'deposit_credit', -25000);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009a2","role":"authenticated"}', true);

SELECT isnt(
  (SELECT id FROM public.scheduling_book_package_appointment(
     '00000000-0000-0000-0000-000000000a01', '2027-09-06 15:00-06',
     '00000000-0000-0000-0000-0000000009d1')),
  NULL::uuid, 'una vez saldada la cita la clienta vuelve a agendar el paquete');

SELECT * FROM finish();
ROLLBACK;
