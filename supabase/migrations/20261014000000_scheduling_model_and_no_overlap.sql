-- US-AGE-09 · scheduling — modelo mínimo de citas y exclusion constraint de no-solape (ADR-0002, ADR-0005).

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TABLE public.scheduling_resources (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (length(btrim(name)) > 0),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Recurso único del estudio, con id fijo para que la aplicación y las pruebas lo nombren sin consultarlo.
INSERT INTO public.scheduling_resources (id, name)
VALUES ('00000000-0000-0000-0000-000000000a01', 'Estudio');

CREATE TABLE public.scheduling_appointments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.scheduling_resources(id),
  status      text NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
    'pending_approval', 'approved', 'confirmed',
    'rejected', 'cancelled', 'completed', 'no_show'
  )),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  occupied_range tstzrange NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scheduling_appointments_service_window CHECK (starts_at < ends_at),
  CONSTRAINT scheduling_appointments_range_bounded CHECK (
    NOT isempty(occupied_range)
    AND NOT lower_inf(occupied_range) AND NOT upper_inf(occupied_range)
    AND lower_inc(occupied_range) AND NOT upper_inc(occupied_range)
  ),
  CONSTRAINT scheduling_appointments_range_covers_service CHECK (
    lower(occupied_range) <= starts_at AND upper(occupied_range) >= ends_at
  ),

  -- Solo los estados activos ocupan el espacio: rechazar, cancelar, completar o ausentarse lo libera.
  CONSTRAINT scheduling_appointments_no_overlap EXCLUDE USING gist (
    resource_id    WITH =,
    occupied_range WITH &&
  ) WHERE (status IN ('pending_approval', 'approved', 'confirmed'))
);

CREATE INDEX idx_scheduling_appointments_resource ON public.scheduling_appointments (resource_id, starts_at);

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
