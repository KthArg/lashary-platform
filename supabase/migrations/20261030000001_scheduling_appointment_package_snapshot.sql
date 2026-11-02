-- 20261030000001_scheduling_appointment_package_snapshot.sql
-- US-AGE-04 · feature scheduling — la cita sabe congelar un paquete, no solo una técnica.
-- Hasta ahora scheduling_appointments_booking_snapshot_complete solo admitía dos formas: vacía (sin
-- reserva) o de una técnica. Esta migración agrega una tercera forma, de paquete, reusando
-- service_price/deposit_required/deposit_registered como "lo que se cobra" sin importar si es una
-- técnica o un paquete (así el ledger, la cancelación y la morosidad de historias futuras no tienen
-- que distinguir origen, DOM-002); technique_id/technique_name quedan NULL en esa forma y
-- package_id/package_name los reemplazan. is_first_time no aplica a un paquete (un paquete no tiene
-- "primera vez o retoque": catalog ya calcula su duración siempre con duration_first_time_min, ver
-- db/packages/package-repository.ts de catalog) y queda NULL también en la forma de paquete.
-- package_id no lleva FK, mismo motivo que technique_id: la cita guarda el nombre y el precio de
-- ese momento y no debe depender de que el paquete siga existiendo en catalog (ARCH-005, DOM-002).
--
-- La tabla nueva scheduling_appointment_package_techniques congela qué técnicas componía el
-- paquete al reservar, con su duración y limpieza de ese momento — lo que pide el criterio 2 de
-- US-AGE-04 (el tiempo total suma duración + limpieza de cada servicio incluido) y lo que van a
-- necesitar US-AGE-12 (cerrar cita) y el reporte de morosidad/ledger más adelante sin tener que
-- volver a leer catalog. Mismo trato de solo-lectura que scheduling_appointments: nadie, ni la
-- clienta ni la administradora, hace INSERT directo — lo llena scheduling_book_package_appointment
-- (SECURITY DEFINER, pieza siguiente), que bypasea RLS igual que scheduling_book_appointment.
--
-- Cumplimiento: ARCH-005, ARCH-006 (prefijo scheduling_), DOM-001, DOM-002, SEC-001 (RLS fail-closed
-- en escritura), SEC-002 (pgTAP y __tests__/rls-isolation.test.ts), INT-008 (una migración,
-- forward-only — ensancha el CHECK existente, no lo angosta).

ALTER TABLE public.scheduling_appointments
  ADD COLUMN package_id    uuid,
  ADD COLUMN package_name  text CHECK (length(btrim(package_name)) > 0);

ALTER TABLE public.scheduling_appointments
  DROP CONSTRAINT scheduling_appointments_booking_snapshot_complete,
  ADD CONSTRAINT scheduling_appointments_booking_snapshot_complete CHECK (
    -- Vacía: sin reserva todavía (citas creadas antes de US-AGE-05, o fuera de este flujo).
    (client_id IS NULL AND technique_id IS NULL AND technique_name IS NULL AND is_first_time IS NULL
       AND package_id IS NULL AND package_name IS NULL
       AND service_price IS NULL AND deposit_required IS NULL)
    OR
    -- Una técnica (US-AGE-05): is_first_time decide la duración/precio aplicados.
    (client_id IS NOT NULL AND technique_id IS NOT NULL AND technique_name IS NOT NULL
       AND is_first_time IS NOT NULL
       AND package_id IS NULL AND package_name IS NULL
       AND service_price IS NOT NULL AND deposit_required IS NOT NULL)
    OR
    -- Un paquete (US-AGE-04): sin is_first_time, sin técnica suelta; las técnicas incluidas van en
    -- scheduling_appointment_package_techniques.
    (client_id IS NOT NULL AND package_id IS NOT NULL AND package_name IS NOT NULL
       AND technique_id IS NULL AND technique_name IS NULL AND is_first_time IS NULL
       AND service_price IS NOT NULL AND deposit_required IS NOT NULL)
  );

CREATE INDEX idx_scheduling_appointments_package
  ON public.scheduling_appointments (package_id) WHERE package_id IS NOT NULL;

-- Snapshot de cada técnica incluida en el paquete al momento de reservar.
CREATE TABLE public.scheduling_appointment_package_techniques (
  appointment_id uuid NOT NULL REFERENCES public.scheduling_appointments (id) ON DELETE CASCADE,
  technique_id   uuid NOT NULL,
  technique_name text NOT NULL CHECK (length(btrim(technique_name)) > 0),
  duration_min   integer NOT NULL CHECK (duration_min > 0),
  buffer_min     integer NOT NULL CHECK (buffer_min >= 0),

  PRIMARY KEY (appointment_id, technique_id)
);

-- appointment_id ya es la columna líder de la PRIMARY KEY, así que "técnicas de una cita" ya usa
-- ese índice. Este índice explícito solo satisface el lint automatizado de PERF-003 (busca un
-- CREATE INDEX por cada columna con REFERENCES), igual que idx_catalog_package_techniques_package.
CREATE INDEX idx_scheduling_appointment_package_techniques_appointment ON public.scheduling_appointment_package_techniques (appointment_id);

ALTER TABLE public.scheduling_appointment_package_techniques ENABLE ROW LEVEL SECURITY;

-- Lectura staff, igual que scheduling_appointments.
CREATE POLICY "scheduling_appointment_package_techniques_select_staff"
  ON public.scheduling_appointment_package_techniques
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

-- La clienta lee las técnicas de sus propios paquetes reservados (mismo patrón que
-- scheduling_appointments_select_own, vía la cita dueña: identifica a la clienta por el contrato
-- de clients, clients_current_profile_id(), nunca leyendo clients_profiles directo — ARCH-005,
-- scheduling_clients_contract.test.sql).
CREATE POLICY "scheduling_appointment_package_techniques_select_own"
  ON public.scheduling_appointment_package_techniques
  FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT a.id FROM public.scheduling_appointments a
       WHERE a.client_id = (SELECT public.clients_current_profile_id())
    )
  );

-- Sin política de INSERT/UPDATE/DELETE: con RLS activo y sin una permisiva, la base deniega toda
-- escritura a anon y a authenticated (fail-closed). El único camino de escritura es
-- scheduling_book_package_appointment, SECURITY DEFINER, que bypasea RLS igual que
-- scheduling_book_appointment ya lo hace para scheduling_appointments.
