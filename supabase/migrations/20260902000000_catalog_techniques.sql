-- 20260902000000_catalog_techniques.sql
-- US-AGE-08 · feature catalog — catálogo de técnicas con tiempos y precios.
-- Cumplimiento: ARCH-006 (prefijo catalog_), DOM-001 (dinero entero), DOM-003 (timestamptz),
--   SEC-001 (RLS es la frontera real), SEC-002 (test de aislamiento en __tests__/),
--   PERF-003 (columna filtrada indexada), INT-008 (una migración, forward-only).

-- 1. Familias de servicio del estudio (criterio 2). Enum plano: el volumen de pestañas va
--    dentro del valor, no como columna aparte (decisión D1 del SPEC).
CREATE TYPE public.catalog_service_family AS ENUM (
  'lash_classic',
  'lash_volume',
  'lash_extra_volume',
  'brow_design',
  'brow_lamination',
  'henna',
  'waxing',
  'lips'
);

-- 2. Catálogo de técnicas. Sin FK a otras tablas a propósito: al confirmar una cita,
--    scheduling copia un snapshot de estos campos (DOM-002); la cita no referencia esta fila.
CREATE TABLE public.catalog_techniques (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL,
  family                      public.catalog_service_family NOT NULL,

  -- Dinero: entero de colones (CRC, exponente 0 — DOM-001 / ADR-0004).
  price_first_time            bigint NOT NULL CHECK (price_first_time > 0),
  price_retouch               bigint CHECK (price_retouch > 0),

  -- Tiempos en minutos.
  duration_first_time_min     integer NOT NULL CHECK (duration_first_time_min > 0),
  duration_retouch_min        integer CHECK (duration_retouch_min > 0),
  buffer_min                  integer NOT NULL DEFAULT 0 CHECK (buffer_min >= 0), -- prep + limpieza (criterio 4)

  reapplication_interval_days integer CHECK (reapplication_interval_days > 0),    -- null = no aplica (D3)

  deposit                     bigint NOT NULL CHECK (deposit >= 0),               -- anticipo requerido (criterio 6)
  aftercare_text              text NOT NULL CHECK (length(btrim(aftercare_text)) > 0), -- criterio 6 (D5)

  is_active                   boolean NOT NULL DEFAULT true,                      -- criterio 7a

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_techniques_name_unique UNIQUE (name),

  -- D10: el retoque necesita precio y duración, o ninguno de los dos.
  CONSTRAINT catalog_techniques_retouch_coherent
    CHECK ((price_retouch IS NULL) = (duration_retouch_min IS NULL))
);

-- 3. Índice de la consulta común: técnicas activas por familia (PERF-003).
CREATE INDEX idx_catalog_techniques_family_active
  ON public.catalog_techniques (family)
  WHERE is_active;

-- 4. updated_at lo mantiene la base, no la app.
CREATE OR REPLACE FUNCTION public.catalog_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER catalog_techniques_set_updated_at
  BEFORE UPDATE ON public.catalog_techniques
  FOR EACH ROW
  EXECUTE FUNCTION public.catalog_set_updated_at();

-- 5. RLS — la autorización real (SEC-001).
ALTER TABLE public.catalog_techniques ENABLE ROW LEVEL SECURITY;

-- Lectura: el catálogo es público (lo consume el sitio, US-LAND-02).
CREATE POLICY "catalog_techniques_select_all"
  ON public.catalog_techniques
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura: SIN política de INSERT / UPDATE / DELETE. Con RLS activo y sin política permisiva,
-- la base deniega toda escritura a anon y authenticated (postura B1, fail-closed).
-- TODO(US-AUTH-01 / US-AUTH-02): agregar políticas de escritura con
--   WITH CHECK (public.auth_is_staff()) cuando la feature auth exponga esa función.
--   El flag catalog_admin_write en src/features/catalog/SPEC.md registra esta brecha.
