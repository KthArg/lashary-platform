-- 20261117040000_delinquency_regularizations.sql
-- US-MOR-03 · feature delinquency — el estado `settled` de una morosidad y la tabla de solicitudes de
-- regularización (contrato: docs/contracts/delinquency-api.md, «Regularización»).
-- - `settled` (saldada): lo pondrá la aprobación de una regularización cuando la cita quede en cero. Viene de
--   una morosidad ya confirmada, así que conserva su decisión, y guarda cuándo se saldó (`settled_at`).
--   Las funciones del contrato filtran por `active` o `pending_review`, así que no la devuelven.
-- - Una solicitud cuelga de una morosidad y guarda lo que la clienta dice haber pagado, una referencia
--   opcional y la ruta del comprobante en el bucket privado. Sus estados: `pending_approval`, `approved`
--   (con el monto aprobado y el asiento de pago), `rejected` (con motivo) y `replaced` (la clienta mandó
--   otro comprobante mientras esta seguía pendiente; lectura provisional de lo que dijo Kenny el 2026-11-13).
--   Cada estado exige sus campos y prohíbe los de los demás, y hay como mucho una pendiente por morosidad.
-- - `client_id` repite el de la morosidad para que las funciones respondan por la clienta de la sesión sin
--   otra consulta. `payment_entry_id` es el asiento del ledger, sin FK: el ledger es de payments (ARCH-005).
-- - RLS: solo staff lee. Nadie con sesión escribe: enviar, aprobar y rechazar serán funciones
--   SECURITY DEFINER, cada una con sus reglas y su bitácora.
-- Cumplimiento: ARCH-005, DOM-005, DOM-011, DOM-012, SEC-001, SEC-002, PERF-003, INT-008.

ALTER TABLE public.delinquency_cases
  ADD COLUMN settled_at timestamptz;

ALTER TABLE public.delinquency_cases
  DROP CONSTRAINT delinquency_cases_state_check,
  DROP CONSTRAINT delinquency_cases_decision_matches_state;

ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_state_check
    CHECK (state IN ('pending_review', 'active', 'dismissed', 'settled')),
  ADD CONSTRAINT delinquency_cases_decision_matches_state CHECK (
    (state = 'pending_review' AND decided_at IS NULL AND decided_by IS NULL)
    OR (state IN ('active', 'dismissed', 'settled') AND decided_at IS NOT NULL AND decided_by IS NOT NULL)
  ),
  ADD CONSTRAINT delinquency_cases_settled_has_date
    CHECK ((state = 'settled') = (settled_at IS NOT NULL));

CREATE TABLE public.delinquency_regularizations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          uuid NOT NULL REFERENCES public.delinquency_cases(id) ON DELETE RESTRICT,
  client_id        uuid NOT NULL REFERENCES public.clients_profiles(id) ON DELETE RESTRICT,
  declared_amount  bigint NOT NULL CHECK (declared_amount > 0),
  reference        text CHECK (reference IS NULL OR length(reference) BETWEEN 1 AND 100),
  receipt_path     text NOT NULL CHECK (length(receipt_path) BETWEEN 1 AND 300),
  state            text NOT NULL DEFAULT 'pending_approval'
                   CHECK (state IN ('pending_approval', 'approved', 'rejected', 'replaced')),
  approved_amount  bigint,
  rejection_reason text,
  payment_entry_id uuid,
  reviewed_by      uuid REFERENCES auth.users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT delinquency_regularizations_state_fields CHECK (
    (state IN ('pending_approval', 'replaced')
      AND approved_amount IS NULL AND rejection_reason IS NULL AND payment_entry_id IS NULL
      AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (state = 'approved'
      AND approved_amount > 0 AND payment_entry_id IS NOT NULL AND rejection_reason IS NULL
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    OR (state = 'rejected'
      AND length(btrim(coalesce(rejection_reason, ''))) BETWEEN 1 AND 500
      AND approved_amount IS NULL AND payment_entry_id IS NULL
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

-- Como mucho una solicitud pendiente por morosidad.
CREATE UNIQUE INDEX idx_delinquency_regularizations_one_pending ON public.delinquency_regularizations (case_id)
  WHERE state = 'pending_approval';

-- La más reciente de cada morosidad (estado de cuenta) y la lista por revisar de la administradora.
CREATE INDEX idx_delinquency_regularizations_case_created ON public.delinquency_regularizations (case_id, created_at DESC);
CREATE INDEX idx_delinquency_regularizations_state_created ON public.delinquency_regularizations (state, created_at);
CREATE INDEX idx_delinquency_regularizations_client ON public.delinquency_regularizations (client_id);
CREATE INDEX idx_delinquency_regularizations_reviewed_by ON public.delinquency_regularizations (reviewed_by);

ALTER TABLE public.delinquency_regularizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delinquency_regularizations_select_staff"
  ON public.delinquency_regularizations
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

REVOKE ALL ON public.delinquency_regularizations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.delinquency_regularizations TO authenticated;
