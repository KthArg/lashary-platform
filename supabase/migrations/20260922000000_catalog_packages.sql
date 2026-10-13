-- 20260922000000_catalog_packages.sql
-- US-PROD-01 · feature catalog — paquetes: combos de dos o más técnicas con precio propio.
-- Cumplimiento: ARCH-006 (prefijo catalog_), DOM-001 (dinero entero), DOM-003 (timestamptz),
--   SEC-001 (RLS es la frontera real), SEC-002 (test de aislamiento en __tests__/),
--   PERF-003 (FK indexada), INT-008 (una migración, forward-only).

-- 1. Paquete: combo de técnicas con precio propio, ajustable a mano (criterio 2).
CREATE TABLE public.catalog_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,

  -- Dinero: entero de colones (CRC, exponente 0 — DOM-001 / ADR-0004).
  price       bigint NOT NULL CHECK (price > 0),

  is_active   boolean NOT NULL DEFAULT true, -- criterio 3: desactivar sin borrar

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_packages_name_unique UNIQUE (name)
);

-- 2. Tabla puente: qué técnicas componen cada paquete. A diferencia de catalog_techniques
--    (sin FK entrantes porque la cita hace snapshot, DOM-002), aquí sí hay FK real: el paquete
--    es composición viva del catálogo actual, no un histórico. Se congelará recién cuando
--    US-AGE-04 confirme una cita con paquete.
CREATE TABLE public.catalog_package_techniques (
  package_id   uuid NOT NULL REFERENCES public.catalog_packages (id),
  technique_id uuid NOT NULL REFERENCES public.catalog_techniques (id),

  PRIMARY KEY (package_id, technique_id)
);

-- El mínimo de dos técnicas por paquete (criterio 1) es un invariante de negocio sobre el
-- conjunto de filas, no una propiedad de una sola fila: lo aplica Package.create en domain/
-- (DOM-007), no un CHECK aquí. El único camino de escritura es el server action de la feature.

-- FK indexada (PERF-003): la búsqueda inversa "técnicas de qué paquetes" y el ON DELETE
-- implícito de Postgres al validar la FK recorren esta columna.
CREATE INDEX idx_catalog_package_techniques_technique ON public.catalog_package_techniques (technique_id);

-- package_id ya es la columna líder de la PRIMARY KEY (package_id, technique_id), así que
-- "técnicas de un paquete" (el join que arma un Package) ya usa ese índice. Este índice
-- explícito solo satisface el lint automatizado de PERF-003 (busca un CREATE INDEX por cada
-- columna con REFERENCES); no aporta un acceso nuevo.
CREATE INDEX idx_catalog_package_techniques_package ON public.catalog_package_techniques (package_id);

-- 3. updated_at lo mantiene la base (reusa la función de la migración de técnicas).
CREATE TRIGGER catalog_packages_set_updated_at
  BEFORE UPDATE ON public.catalog_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.catalog_set_updated_at();

-- 4. RLS — la autorización real (SEC-001).
ALTER TABLE public.catalog_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_package_techniques ENABLE ROW LEVEL SECURITY;

-- Lectura: pública, igual que catalog_techniques.
CREATE POLICY "catalog_packages_select_all"
  ON public.catalog_packages
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "catalog_package_techniques_select_all"
  ON public.catalog_package_techniques
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura: SIN política de INSERT / UPDATE / DELETE en esta migración. Con RLS activo y sin
-- política permisiva, la base deniega toda escritura a anon y authenticated (postura B1,
-- fail-closed) — igual que catalog_techniques hasta su migración de escritura.
-- Las políticas staff llegan en 20260922000001_catalog_package_write_policies.sql.
