-- US-AGE-04 · scheduling — scheduling_slot_is_taken(p_resource_id, p_starts_at, p_occupied_until),
-- extraída de scheduling_book_package_appointment para no duplicar el criterio de "¿está ocupado?"
-- con scheduling_book_appointment (hallazgo de code review, ver 20261030000005).
-- Correr con: npx supabase test db

BEGIN;
SELECT plan(5);

INSERT INTO public.scheduling_appointments
  (id, resource_id, starts_at, ends_at, occupied_range)
VALUES
  ('00000000-0000-0000-0000-000000005901',
   '00000000-0000-0000-0000-000000000a01',
   '2027-04-01 10:00+00', '2027-04-01 11:00+00',
   tstzrange('2027-04-01 09:45+00', '2027-04-01 11:15+00', '[)'));

INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at)
VALUES ('00000000-0000-0000-0000-000000000a01', '2027-04-02 09:00+00', '2027-04-02 10:00+00');

SELECT is(
  public.scheduling_slot_is_taken('00000000-0000-0000-0000-000000000a01',
    '2027-04-01 09:45+00', '2027-04-01 11:15+00'),
  true, 'el mismo rango que una cita activa está ocupado');

SELECT is(
  public.scheduling_slot_is_taken('00000000-0000-0000-0000-000000000a01',
    '2027-04-01 11:15+00', '2027-04-01 12:15+00'),
  false, 'justo después del rango ocupado, sin solape, está libre');

SELECT is(
  public.scheduling_slot_is_taken('00000000-0000-0000-0000-000000000a01',
    '2027-04-02 09:30+00', '2027-04-02 10:30+00'),
  true, 'un bloqueo manual también cuenta como ocupado');

UPDATE public.scheduling_appointments SET status = 'cancelled'
 WHERE id = '00000000-0000-0000-0000-000000005901';

SELECT is(
  public.scheduling_slot_is_taken('00000000-0000-0000-0000-000000000a01',
    '2027-04-01 09:45+00', '2027-04-01 11:15+00'),
  false, 'una cita cancelada ya no ocupa el espacio');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.scheduling_slot_is_taken('00000000-0000-0000-0000-000000000a01',
      '2027-04-01 09:45+00', '2027-04-01 11:15+00')$$,
  '42501', NULL, 'solo otra función SECURITY DEFINER la llama, no directo por PostgREST');

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
