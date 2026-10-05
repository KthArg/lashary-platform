-- 20260924000000_payments_deposit_exemptions.sql
-- US-AGE-13 · feature payments — exoneración de anticipo por cliente (criterio 5).
-- Cumplimiento: ARCH-006 (prefijo payments_), DOM-003 (timestamptz UTC), SEC-001 (RLS es la
-- frontera real), SEC-002 (test de aislamiento en __tests__/), PERF-003 (FK indexadas),
-- INT-008 (una migración, forward-only).

-- A diferencia de audit_events, esta tabla siempre apunta al mismo tipo de recurso (un cliente):
-- la relación es homogénea y permanente, no heterogénea como la de la bitácora — FK real, no
-- referencia suelta.
CREATE TABLE public.payments_deposit_exemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id   uuid NOT NULL REFERENCES public.clients_profiles(id) ON DELETE CASCADE,
  exempted_by uuid NOT NULL REFERENCES auth.users(id), -- quién la otorgó
  reason      text NOT NULL CHECK (length(btrim(reason)) > 0),

  -- Estado vigente. Criterio 5 de US-AGE-13 solo pide otorgar la exoneración; levantarla es
  -- una capacidad futura (US-MOR-05 y similares) que todavía no tiene UI ni política de UPDATE
  -- — la columna existe ahora para no tener que migrar el esquema cuando llegue esa historia.
  active      boolean NOT NULL DEFAULT true,

  created_at  timestamptz NOT NULL DEFAULT now(), -- UTC (DOM-003)
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- FK indexada (PERF-003): cualquier consulta por cliente, activo o no.
CREATE INDEX idx_payments_deposit_exemptions_client ON public.payments_deposit_exemptions (client_id);

-- Un cliente no puede tener dos exoneraciones vigentes a la vez (parcial: solo cubre las activas,
-- por eso el índice de arriba además, para consultas que no filtran por active).
CREATE UNIQUE INDEX idx_payments_deposit_exemptions_client_active ON public.payments_deposit_exemptions (client_id) WHERE active;

-- FK indexada (PERF-003): quién otorgó cada exoneración.
CREATE INDEX idx_payments_deposit_exemptions_exempted_by ON public.payments_deposit_exemptions (exempted_by);

CREATE OR REPLACE FUNCTION public.payments_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_deposit_exemptions_set_updated_at
  BEFORE UPDATE ON public.payments_deposit_exemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.payments_set_updated_at();

-- RLS (SEC-001). Administrativa: ni lectura ni escritura son públicas ni de la propia clienta
-- (ningún criterio de US-AGE-13 pide que la clienta vea su exoneración todavía).
ALTER TABLE public.payments_deposit_exemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_deposit_exemptions_select_staff"
  ON public.payments_deposit_exemptions
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "payments_deposit_exemptions_insert_staff"
  ON public.payments_deposit_exemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

-- Deliberadamente SIN política de UPDATE ni DELETE todavía: "levantar" una exoneración no es
-- parte del criterio 5 de US-AGE-13. Con RLS activo y sin política, la base deniega ambas a
-- cualquier rol — se agregan cuando una historia futura construya esa capacidad.
