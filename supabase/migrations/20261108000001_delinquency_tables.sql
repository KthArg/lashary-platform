-- 20261108000001_delinquency_tables.sql
-- US-MOR-01 · feature delinquency — las morosidades y su configuración (criterios 1 y 2; contrato:
-- docs/contracts/delinquency-api.md). Una morosidad nace de una cita cerrada con saldo pendiente
-- pasado el periodo de gracia y empieza en `pending_review`: la administradora la revisa y la confirma
-- (`active`) o la descarta (`dismissed`). `pending_review` no tiene ninguna consecuencia sobre la
-- clienta; solo `active` cuenta como morosidad (DOM-012).
-- Una morosidad por cita (UNIQUE appointment_id): una descartada no vuelve a generarse por la misma
-- cita. `appointment_id` no tiene FK a propósito: la cita es de otra feature (ARCH-005).
-- La configuración vive en una tabla de una sola fila para que la administradora la cambie sin pasar
-- por una migración, y solo por una función con bitácora (piezas siguientes): staff la lee, nadie la escribe directo. La gracia arranca en 7 días, de 1 a 90, y el PO la aprobó (Kenny, 2026-11-08);
-- cambiarla solo rige para las detecciones nuevas, no toca las morosidades ya generadas. No hay bandera
-- de encendido: la detección lee el ledger y funciona sola cuando US-MOR-03 registre pagos; lo que la
-- mantiene quieta hasta entonces es que el cron no está programado (SPEC de `delinquency`).
-- Las morosidades las escriben funciones SECURITY DEFINER de las piezas siguientes: staff solo lee.
-- Cumplimiento: ARCH-005, ARCH-006, DOM-005, DOM-012, SEC-001, SEC-002, SEC-006, PERF-002, INT-008.

CREATE TABLE public.delinquency_settings (
  singleton  boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  -- Identifica la configuración en la bitácora (audit_events.entity_id es uuid).
  id         uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  grace_days integer NOT NULL DEFAULT 7 CHECK (grace_days BETWEEN 1 AND 90)
);

INSERT INTO public.delinquency_settings (singleton) VALUES (true);

ALTER TABLE public.delinquency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delinquency_settings_select_staff"
  ON public.delinquency_settings
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

REVOKE ALL ON public.delinquency_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.delinquency_settings TO authenticated;

CREATE TABLE public.delinquency_cases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid NOT NULL REFERENCES public.clients_profiles(id) ON DELETE RESTRICT,
  appointment_id uuid NOT NULL,
  pending        bigint NOT NULL CHECK (pending > 0),
  state          text NOT NULL DEFAULT 'pending_review'
                 CHECK (state IN ('pending_review', 'active', 'dismissed')),
  detected_at    timestamptz NOT NULL DEFAULT now(),
  decided_at     timestamptz,
  decided_by     uuid REFERENCES auth.users(id),

  CONSTRAINT delinquency_cases_one_per_appointment UNIQUE (appointment_id),
  CONSTRAINT delinquency_cases_decision_matches_state CHECK (
    (state = 'pending_review' AND decided_at IS NULL AND decided_by IS NULL)
    OR (state IN ('active', 'dismissed') AND decided_at IS NOT NULL AND decided_by IS NOT NULL)
  )
);

CREATE INDEX idx_delinquency_cases_client ON public.delinquency_cases (client_id);
CREATE INDEX idx_delinquency_cases_state_detected ON public.delinquency_cases (state, detected_at DESC);
CREATE INDEX idx_delinquency_cases_decided_by ON public.delinquency_cases (decided_by);

ALTER TABLE public.delinquency_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delinquency_cases_select_staff"
  ON public.delinquency_cases
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

REVOKE ALL ON public.delinquency_cases FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.delinquency_cases TO authenticated;
