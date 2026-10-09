-- 20261009000000_catalog_promotions.sql
-- US-PROM-01 · feature catalog — promociones sobre una técnica o un paquete.
-- Cumplimiento: ARCH-006 (prefijo catalog_), DOM-001 (porcentaje, no dinero flotante),
--   DOM-003 (timestamptz), SEC-001 (RLS es la frontera real), SEC-002 (test de aislamiento),
--   PERF-003 (FK indexada), INT-008 (una migración, forward-only).

-- 1. Promoción: descuento sobre una técnica o un paquete existente, con vigencia.
--    Sin FK a nada que la cita vaya a copiar (el congelamiento del precio con promoción en
--    la cita es DOM-002 y lo demuestra US-AGE-05, que trae la tabla de citas — criterio
--    diferido, ver docs/process/DEPENDENCIES.md). Las FK aquí son hacia el catálogo vivo
--    (igual que catalog_package_techniques): la promoción no sobrevive si se borra su técnica
--    o paquete, pero en este catálogo nunca se borra (is_active = false en su lugar).
CREATE TABLE public.catalog_promotions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  technique_id      uuid REFERENCES public.catalog_techniques (id),
  package_id        uuid REFERENCES public.catalog_packages (id),

  -- Descuento como porcentaje entero (D-PROM-1 del SPEC): no es un monto, Money no aplica.
  discount_percent  integer NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),

  -- Vigencia (criterio 1). "Vencida" (criterio 3) se deriva comparando contra el reloj
  -- inyectado (DOM-004) en la capa de aplicación, nunca con una columna que haya que mantener.
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL,

  is_active         boolean NOT NULL DEFAULT true, -- pausa manual, distinta de "vencida"

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- El servicio aplicable es exactamente uno: una técnica XOR un paquete (criterio 1).
  CONSTRAINT catalog_promotions_target_xor
    CHECK ((technique_id IS NULL) <> (package_id IS NULL)),

  CONSTRAINT catalog_promotions_window_valid
    CHECK (ends_at > starts_at)
);

-- FK indexadas (PERF-003).
CREATE INDEX idx_catalog_promotions_technique ON public.catalog_promotions (technique_id);
CREATE INDEX idx_catalog_promotions_package ON public.catalog_promotions (package_id);

-- Consulta común: promociones vigentes ahora (criterios 2 y 3) — activas cuya ventana
-- contiene el instante actual. Índice parcial sobre la columna de corte más selectiva.
CREATE INDEX idx_catalog_promotions_active_window
  ON public.catalog_promotions (starts_at, ends_at)
  WHERE is_active;

-- 2. updated_at lo mantiene la base (reusa la función de la migración de técnicas).
CREATE TRIGGER catalog_promotions_set_updated_at
  BEFORE UPDATE ON public.catalog_promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.catalog_set_updated_at();

-- 3. RLS — la autorización real (SEC-001).
ALTER TABLE public.catalog_promotions ENABLE ROW LEVEL SECURITY;

-- Lectura: pública, igual que catalog_techniques / catalog_packages. El filtro de "vigente"
-- (is_active + ventana) lo aplica la capa de aplicación (listActivePromotions), no RLS —
-- la administradora necesita ver también las vencidas y las pausadas en su panel.
CREATE POLICY "catalog_promotions_select_all"
  ON public.catalog_promotions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura: SIN política de INSERT / UPDATE / DELETE en esta migración. Con RLS activo y sin
-- política permisiva, la base deniega toda escritura a anon y authenticated (postura B1,
-- fail-closed) — igual que catalog_techniques / catalog_packages hasta su migración de
-- escritura. Las políticas staff llegan en 20261009000001_catalog_promotions_write_policies.sql.
