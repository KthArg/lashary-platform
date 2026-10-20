-- 20261018000002_scheduling_appointment_client_snapshot.sql
-- US-AGE-05 · feature scheduling — la cita sabe de quién es y congela lo que se acordó al reservar.
-- Hasta ahora una cita solo tenía recurso, estado y horario. Esta migración agrega la clienta, la
-- técnica elegida y los montos congelados (DOM-002: el precio y el anticipo no se recalculan desde
-- el catálogo actual), y deja que la clienta lea sus propias citas.
-- No cambia quién puede insertar ni actualizar: la reserva de la clienta entra por una función en
-- la siguiente pieza, con `client_id` tomado de la sesión (SEC-005).
-- Cumplimiento: DOM-002, SEC-001 (RLS solo de lo propio), SEC-002 (pgTAP
--   scheduling_appointment_client_snapshot.test.sql y __tests__/rls-isolation.test.ts),
--   PERF-003 (FK indexada), INT-008 (una migración, forward-only).

-- `client_id` apunta a clients_profiles(id), la misma identidad que usan las exoneraciones de
-- payments, y no a auth.users: una clienta puede existir sin cuenta (la administradora las crea) y
-- US-MOR-02 agenda en nombre de ellas. RESTRICT: una clienta con citas se archiva, no se borra
-- (ADR-0009). `technique_id` no lleva FK: la cita guarda el nombre y los montos de ese momento y no
-- debe depender de que la técnica siga existiendo.
ALTER TABLE public.scheduling_appointments
  ADD COLUMN client_id          uuid REFERENCES public.clients_profiles (id) ON DELETE RESTRICT,
  ADD COLUMN technique_id       uuid,
  ADD COLUMN technique_name     text CHECK (length(btrim(technique_name)) > 0),
  ADD COLUMN is_first_time      boolean,
  ADD COLUMN service_price      bigint CHECK (service_price > 0),
  ADD COLUMN deposit_required   bigint CHECK (deposit_required >= 0),
  ADD COLUMN deposit_registered bigint NOT NULL DEFAULT 0 CHECK (deposit_registered >= 0);

-- Las citas que ya existían (sin clienta ni técnica) siguen siendo válidas; una cita nueva con
-- clienta trae todos los datos o ninguno, nunca a medias.
ALTER TABLE public.scheduling_appointments
  ADD CONSTRAINT scheduling_appointments_booking_snapshot_complete CHECK (
    (client_id IS NULL AND technique_id IS NULL AND technique_name IS NULL AND is_first_time IS NULL
       AND service_price IS NULL AND deposit_required IS NULL)
    OR
    (client_id IS NOT NULL AND technique_id IS NOT NULL AND technique_name IS NOT NULL
       AND is_first_time IS NOT NULL AND service_price IS NOT NULL AND deposit_required IS NOT NULL)
  ),
  ADD CONSTRAINT scheduling_appointments_deposit_registered_within_required CHECK (
    deposit_registered <= deposit_required
  );

CREATE INDEX idx_scheduling_appointments_client
  ON public.scheduling_appointments (client_id, starts_at) WHERE client_id IS NOT NULL;

-- La clienta lee solo sus citas. La política se apoya en la RLS de clients_profiles: la subconsulta
-- solo ve el perfil de quien llama.
CREATE POLICY "scheduling_appointments_select_own"
  ON public.scheduling_appointments
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients_profiles WHERE user_id = auth.uid())
  );
