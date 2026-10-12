-- Disponibilidad semanal de agenda (US-AGE-01, ARCH-006, SEC-001, ADR-0005: recurso explícito)
CREATE TABLE public.scheduling_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed real: un único recurso (la dueña), no solo la estructura (ADR-0005).
INSERT INTO public.scheduling_resources (name) VALUES ('Dueña');

CREATE TABLE public.scheduling_weekly_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.scheduling_resources(id),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_scheduling_weekly_availability_resource_id ON public.scheduling_weekly_availability(resource_id);

ALTER TABLE public.scheduling_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_weekly_availability ENABLE ROW LEVEL SECURITY;

-- Lectura pública: el calendario público (US-AGE-02) la necesita incluso sin sesión.
CREATE POLICY "scheduling_resources_select_all" ON public.scheduling_resources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "scheduling_weekly_availability_select_all" ON public.scheduling_weekly_availability FOR SELECT TO anon, authenticated USING (true);

-- Escritura solo admin/superadmin (SEC-001). scheduling no consulta auth_user_roles directamente
-- (ARCH-005): le pregunta a public.auth_is_admin(), ya establecida en 20260911000000.
CREATE POLICY "scheduling_weekly_availability_write_admin" ON public.scheduling_weekly_availability FOR ALL TO authenticated
    USING ((SELECT public.auth_is_admin()))
    WITH CHECK ((SELECT public.auth_is_admin()));
