-- 20261014000000_scheduling_model_and_no_overlap.sql
-- US-AGE-09 · feature scheduling — modelo mínimo de recursos y citas, y el exclusion constraint
-- de no-solape (ADR-0002, ADR-0005). Lo porta esta historia porque el constraint necesita su
-- tabla y US-AGE-05 depende de US-AGE-09; US-AGE-05 extiende la tabla (clienta, técnica, anticipo).
-- Cumplimiento: DOM-010 (la base garantiza el no-solape), DOM-003 (timestamptz UTC), ARCH-006
-- (prefijo scheduling_), SEC-001 (RLS es la frontera real), SEC-002 (tests de aislamiento),
-- PERF-003 (FKs indexadas), INT-008 (una migración, forward-only).

-- btree_gist permite combinar "=" sobre resource_id con "&&" sobre el rango en un solo índice GiST.
-- En Supabase las extensiones viven en el esquema "extensions".
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ADR-0005: recurso explícito desde el día uno. Hoy hay uno solo (la dueña) y la UI no muestra
-- selector mientras sea así; sumar una técnica es una fila nueva, no una migración estructural.
CREATE TABLE public.scheduling_resources (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (length(btrim(name)) > 0),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now() -- UTC (DOM-003)
);

-- El recurso único del estudio. Es dato de referencia (no de prueba): sin él ninguna cita tiene
-- a qué apuntar. Id fijo y documentado para que la aplicación y las pruebas lo nombren sin
-- consultarlo.
INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-0000-0000-000000000a01', 'Estudio');

CREATE TABLE public.scheduling_appointments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.scheduling_resources(id),

  -- Ciclo de vida. Los tres primeros ocupan el espacio (ADR-0002/0003: la pendiente de aprobación
  -- ya ocupa, si no dos pendientes podrían apuntar al mismo espacio). Los demás lo liberan sin
  -- borrar la fila.
  status      text NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
    'pending_approval', 'approved', 'confirmed',
    'rejected', 'cancelled', 'completed', 'no_show'
  )),

  -- Lo que la clienta ve: el servicio, de principio a fin. Todo instante en UTC (DOM-003).
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,

  -- Lo que realmente ocupa la agenda: [inicio - preparación, fin + limpieza) (DOM-010). Solo el
  -- dominio de scheduling lo calcula; la base se limita a exigir que sea coherente con el
  -- servicio y a impedir que dos citas activas se pisen.
  occupied_range tstzrange NOT NULL,

  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scheduling_appointments_service_window CHECK (starts_at < ends_at),
  -- Un rango acotado, no vacío, cerrado al inicio y abierto al final ('[)', como en ADR-0002) que
  -- contenga todo el servicio: nadie puede "ocupar menos" de lo que dura la cita y así esquivar el
  -- constraint. La comparación usa lower/upper y no construye un rango con starts_at/ends_at, para
  -- que un servicio invertido falle por service_window y no por un error de construcción.
  CONSTRAINT scheduling_appointments_range_bounded CHECK (
    NOT isempty(occupied_range)
    AND NOT lower_inf(occupied_range) AND NOT upper_inf(occupied_range)
    AND lower_inc(occupied_range) AND NOT upper_inc(occupied_range)
  ),
  CONSTRAINT scheduling_appointments_range_covers_service CHECK (
    lower(occupied_range) <= starts_at AND upper(occupied_range) >= ends_at
  ),

  -- DOM-010 / ADR-0002: la no-superposición la garantiza la base, no una consulta previa. Solo
  -- cuenta lo activo: una cita rechazada, cancelada, completada o ausente libera el espacio.
  CONSTRAINT scheduling_appointments_no_overlap EXCLUDE USING gist (
    resource_id    WITH =,
    occupied_range WITH &&
  ) WHERE (status IN ('pending_approval', 'approved', 'confirmed'))
);

-- FK indexada (PERF-003) y consulta típica de la agenda: citas de un recurso en orden de inicio.
CREATE INDEX idx_scheduling_appointments_resource ON public.scheduling_appointments (resource_id, starts_at);

-- RLS (SEC-001). Administrativa por ahora: la clienta no ve ni escribe citas hasta que
-- US-AGE-02/05 construyan esos flujos y sus políticas.
ALTER TABLE public.scheduling_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_resources_select_staff"
  ON public.scheduling_resources
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "scheduling_appointments_select_staff"
  ON public.scheduling_appointments
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "scheduling_appointments_insert_staff"
  ON public.scheduling_appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

-- Deliberadamente SIN políticas de escritura sobre scheduling_resources y SIN UPDATE ni DELETE
-- sobre scheduling_appointments todavía: aprobar y rechazar (UPDATE de status) llega en una pieza
-- posterior de esta historia, y una cita nunca se borra — se cancela o se rechaza, para que el
-- historial exista. Con RLS activo y sin política, la base deniega esas operaciones a todo rol.
