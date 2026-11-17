-- scheduling_slot_validation_parity.test.sql
-- US-MOR-02 · scheduling — las tres reservas (técnica de la clienta, paquete de la clienta y la de la
-- administradora) copian la misma validación de franja. Esta prueba las compara ante la misma franja
-- inválida: las tres deben rechazarla con el mismo error. Si una cambia y otra no (por ejemplo, al agregar
-- el horizonte o la antelación mínima), la administradora podría agendar algo que la clienta no, y esta
-- prueba falla diciendo cuál se separó. Deuda registrada en scheduling/SPEC.md (extraer la validación a una
-- función auxiliar usada por las tres).
-- Lunes de prueba: 2027-09-06 (abierto 09:00–12:00 y 12:00–17:00). Hora de Costa Rica, UTC-6. La técnica
-- dura 60 + 15 de limpieza; el paquete, 60 + 15 y 30 + 5. Todo se deshace con ROLLBACK y no se usa la
-- service-role key (SEC-003).
--
-- Correr con: npx supabase test db   (requiere `supabase start`)

BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-0000000011a1', 'paridad-admin@test.local'),
  ('00000000-0000-0000-0000-0000000011a2', 'paridad-clienta@test.local');

UPDATE public.auth_user_roles SET role = 'admin'
 WHERE user_id = '00000000-0000-0000-0000-0000000011a1';

INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-0000000011c2', '00000000-0000-0000-0000-0000000011a2', 'Clienta paridad',
        'paridad-clienta@test.local', '+50688884002');

INSERT INTO public.catalog_techniques
  (id, name, family, price_first_time, duration_first_time_min, buffer_min, deposit, aftercare_text, is_active)
VALUES
  ('00000000-0000-0000-0000-0000000011f1', 'zz-paridad técnica 1', 'lash_classic', 20000, 60, 15, 0, 'cuidados', true),
  ('00000000-0000-0000-0000-0000000011f2', 'zz-paridad técnica 2', 'brow_design', 10000, 30, 5, 0, 'cuidados', true);

INSERT INTO public.catalog_packages (id, name, price, deposit, is_active)
VALUES ('00000000-0000-0000-0000-0000000011d1', 'zz-paridad paquete', 25000, 0, true);

INSERT INTO public.catalog_package_techniques (package_id, technique_id) VALUES
  ('00000000-0000-0000-0000-0000000011d1', '00000000-0000-0000-0000-0000000011f1'),
  ('00000000-0000-0000-0000-0000000011d1', '00000000-0000-0000-0000-0000000011f2');

DELETE FROM public.scheduling_weekly_availability WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_closed_dates WHERE resource_id = '00000000-0000-0000-0000-000000000a01';
DELETE FROM public.scheduling_manual_blocks WHERE resource_id = '00000000-0000-0000-0000-000000000a01';

INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 1, 540, 720),
  ('00000000-0000-0000-0000-000000000a01', 1, 720, 1020);

INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind)
VALUES ('00000000-0000-0000-0000-000000000a01', '2027-09-13', 'non_working');

UPDATE public.scheduling_booking_limits SET max_pending_per_client = 100;

-- Intenta la misma franja con las tres reservas y devuelve, en orden (técnica, paquete, administradora), el
-- error de cada una, o «reservó» si la aceptó. La clienta reserva con su sesión; la administradora, con la
-- suya y por esa misma clienta.
CREATE FUNCTION pg_temp.slot_outcomes(p_resource_id uuid, p_starts_at timestamptz)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_outcomes text[] := ARRAY[]::text[];
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000011a2","role":"authenticated"}', true);
  BEGIN
    PERFORM public.scheduling_book_appointment(
      p_resource_id => p_resource_id, p_starts_at => p_starts_at,
      p_technique_id => '00000000-0000-0000-0000-0000000011f1', p_is_first_time => true);
    v_outcomes := v_outcomes || 'reservó'::text;
  EXCEPTION WHEN OTHERS THEN
    v_outcomes := v_outcomes || SQLERRM;
  END;

  BEGIN
    PERFORM public.scheduling_book_package_appointment(
      p_resource_id => p_resource_id, p_starts_at => p_starts_at,
      p_package_id => '00000000-0000-0000-0000-0000000011d1');
    v_outcomes := v_outcomes || 'reservó'::text;
  EXCEPTION WHEN OTHERS THEN
    v_outcomes := v_outcomes || SQLERRM;
  END;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000011a1","role":"authenticated"}', true);
  BEGIN
    PERFORM public.scheduling_admin_book_appointment(
      p_client_id => '00000000-0000-0000-0000-0000000011c2', p_resource_id => p_resource_id,
      p_starts_at => p_starts_at, p_technique_id => '00000000-0000-0000-0000-0000000011f1',
      p_is_first_time => true);
    v_outcomes := v_outcomes || 'reservó'::text;
  EXCEPTION WHEN OTHERS THEN
    v_outcomes := v_outcomes || SQLERRM;
  END;

  RETURN v_outcomes;
END;
$$;

CREATE TEMP TABLE expected_rejection AS
  SELECT ARRAY['scheduling_slot_not_offered', 'scheduling_slot_not_offered', 'scheduling_slot_not_offered'] AS outcomes;

SELECT is(pg_temp.slot_outcomes('00000000-0000-0000-0000-000000000a01', '2027-09-06 09:15-06'),
  (SELECT outcomes FROM expected_rejection),
  'una hora fuera de la grilla de 30 minutos la rechazan las tres');

SELECT is(pg_temp.slot_outcomes('00000000-0000-0000-0000-000000000a01', '2027-09-06 07:00-06'),
  (SELECT outcomes FROM expected_rejection),
  'una hora antes de abrir la rechazan las tres');

SELECT is(pg_temp.slot_outcomes('00000000-0000-0000-0000-000000000a01', '2027-09-06 16:30-06'),
  (SELECT outcomes FROM expected_rejection),
  'un servicio que termina después del cierre lo rechazan las tres');

SELECT is(pg_temp.slot_outcomes('00000000-0000-0000-0000-000000000a01', '2027-09-07 09:00-06'),
  (SELECT outcomes FROM expected_rejection),
  'un día sin disponibilidad (martes) lo rechazan las tres');

SELECT is(pg_temp.slot_outcomes('00000000-0000-0000-0000-000000000a01', '2027-09-13 09:00-06'),
  (SELECT outcomes FROM expected_rejection),
  'un día cerrado lo rechazan las tres');

SELECT is(pg_temp.slot_outcomes('00000000-0000-0000-0000-000000000a01', '2020-01-06 09:00-06'),
  (SELECT outcomes FROM expected_rejection),
  'una hora en el pasado la rechazan las tres');

SELECT is(pg_temp.slot_outcomes('00000000-0000-0000-0000-000000000a01', '2027-09-06 09:00:30-06'),
  (SELECT outcomes FROM expected_rejection),
  'una hora con segundos sueltos la rechazan las tres');

SELECT is(pg_temp.slot_outcomes('00000000-0000-0000-0000-00000000dead', '2027-09-06 09:00-06'),
  (SELECT outcomes FROM expected_rejection),
  'un recurso que no existe lo rechazan las tres');

SELECT * FROM finish();
ROLLBACK;
