-- 20261015000000_scheduling_availability.sql
-- US-AGE-01 · feature scheduling — bloques semanales (criterio 1), días no laborables y feriados
-- (criterio 2) y bloqueos manuales puntuales (criterio 3), todo por recurso (ADR-0005).
-- Se apoya en 20261014000000_scheduling_model_and_no_overlap.sql (US-AGE-09): esa migración crea
-- btree_gist, public.scheduling_resources con el recurso único del estudio y su RLS de lectura.
-- Cumplimiento: ARCH-006 (prefijo scheduling_), DOM-003 (instantes en timestamptz), SEC-001 (RLS
--   es la frontera real), SEC-002 (test de aislamiento en __tests__/ y pgTAP), PERF-003 (FK
--   indexadas), INT-008 (una migración por historia, forward-only).

-- 1. Bloques semanales de disponibilidad (criterio 1). Son horas de pared recurrentes en la
--    zona del estudio (America/Costa_Rica), no instantes: por eso minutos desde la medianoche y
--    no timestamptz (DOM-003 aplica a instantes; los bloqueos puntuales sí van en UTC).
--    weekday sigue ISO 8601: 1 = lunes … 7 = domingo.
CREATE TABLE public.scheduling_weekly_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  uuid NOT NULL REFERENCES public.scheduling_resources (id) ON DELETE RESTRICT,
  weekday      smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_min    integer NOT NULL CHECK (start_min BETWEEN 0 AND 1439),
  end_min      integer NOT NULL CHECK (end_min BETWEEN 1 AND 1440),
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scheduling_weekly_availability_start_before_end CHECK (start_min < end_min),

  -- Dos bloques del mismo día y recurso no se solapan. El dominio lo valida antes para dar un
  -- mensaje amable; esta es la garantía real.
  CONSTRAINT scheduling_weekly_availability_no_overlap EXCLUDE USING gist (
    resource_id WITH =,
    weekday WITH =,
    int4range(start_min, end_min) WITH &&
  )
);

-- La FK queda cubierta por el índice gist del constraint (resource_id es su primera columna),
-- pero la consulta común (bloques de un recurso ordenados por día y hora) usa este (PERF-003).
CREATE INDEX idx_scheduling_weekly_availability_resource ON public.scheduling_weekly_availability (resource_id, weekday, start_min);

-- 2. RLS (SEC-001). Solo staff lee y escribe. El calendario público (US-AGE-02) agregará su
--    propia vía de lectura cuando exista; hasta entonces nada de esto es visible fuera del panel.
ALTER TABLE public.scheduling_weekly_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_weekly_availability_select_staff"
  ON public.scheduling_weekly_availability
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "scheduling_weekly_availability_insert_staff"
  ON public.scheduling_weekly_availability
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "scheduling_weekly_availability_delete_staff"
  ON public.scheduling_weekly_availability
  FOR DELETE
  TO authenticated
  USING (public.auth_is_staff());

-- Sin UPDATE: cambiar un bloque es borrarlo y crear otro, así el no-solape se revalida entero.

-- 3. Días cerrados. closed_on es una fecha de calendario en la zona del estudio, no un
--    instante: el día entero queda sin disponibilidad. kind distingue el día no laborable
--    (decisión del estudio) del feriado; label es el nombre opcional ("Navidad").
CREATE TABLE public.scheduling_closed_dates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  uuid NOT NULL REFERENCES public.scheduling_resources (id) ON DELETE RESTRICT,
  closed_on    date NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('non_working', 'holiday')),
  label        text CHECK (label IS NULL OR length(btrim(label)) > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scheduling_closed_dates_one_per_day UNIQUE (resource_id, closed_on)
);

-- El UNIQUE ya indexa (resource_id, closed_on); este índice explícito lo deja visible (PERF-003).
CREATE INDEX idx_scheduling_closed_dates_resource ON public.scheduling_closed_dates (resource_id, closed_on);

-- 4. Bloqueos manuales puntuales. Son instantes: UTC en timestamptz (DOM-003). Dos bloqueos del
--    mismo recurso no se solapan (rango semiabierto, como los bloques semanales).
CREATE TABLE public.scheduling_manual_blocks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  uuid NOT NULL REFERENCES public.scheduling_resources (id) ON DELETE RESTRICT,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  reason       text CHECK (reason IS NULL OR length(btrim(reason)) > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scheduling_manual_blocks_start_before_end CHECK (starts_at < ends_at),

  CONSTRAINT scheduling_manual_blocks_no_overlap EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  )
);

CREATE INDEX idx_scheduling_manual_blocks_resource ON public.scheduling_manual_blocks (resource_id, starts_at);

-- 5. RLS (SEC-001) de días cerrados y bloqueos: solo staff. El motivo de un bloqueo es personal;
--    el calendario público (US-AGE-02) solo deberá ver que el espacio no está disponible.
ALTER TABLE public.scheduling_closed_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_manual_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_closed_dates_select_staff"
  ON public.scheduling_closed_dates FOR SELECT TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "scheduling_closed_dates_insert_staff"
  ON public.scheduling_closed_dates FOR INSERT TO authenticated
  WITH CHECK (public.auth_is_staff());

CREATE POLICY "scheduling_closed_dates_delete_staff"
  ON public.scheduling_closed_dates FOR DELETE TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "scheduling_manual_blocks_select_staff"
  ON public.scheduling_manual_blocks FOR SELECT TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "scheduling_manual_blocks_insert_staff"
  ON public.scheduling_manual_blocks FOR INSERT TO authenticated
  WITH CHECK (public.auth_is_staff());

-- Sin DELETE ni UPDATE en scheduling_manual_blocks: desbloquear un espacio es el criterio 3 de
-- US-AGE-07, que agregará su política. Sin UPDATE en scheduling_closed_dates: cambiar un día
-- cerrado es borrarlo y crearlo de nuevo.
