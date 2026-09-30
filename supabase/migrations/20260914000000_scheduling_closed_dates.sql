-- Días no laborables y feriados (US-AGE-01, pieza 2/3), ARCH-006, SEC-001.
CREATE TABLE public.scheduling_closed_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.scheduling_resources(id),
    closed_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE (resource_id, closed_date)
);
CREATE INDEX idx_scheduling_closed_dates_resource_id ON public.scheduling_closed_dates(resource_id);

ALTER TABLE public.scheduling_closed_dates ENABLE ROW LEVEL SECURITY;

-- Lectura pública: el calendario público (US-AGE-02) la necesita incluso sin sesión.
CREATE POLICY "scheduling_closed_dates_select_all" ON public.scheduling_closed_dates FOR SELECT TO anon, authenticated USING (true);

-- Escritura solo admin/superadmin (SEC-001). scheduling no consulta auth_user_roles directamente
-- (ARCH-005): le pregunta a public.auth_is_admin(), ya establecida en 20260911000000.
CREATE POLICY "scheduling_closed_dates_write_admin" ON public.scheduling_closed_dates FOR ALL TO authenticated
    USING ((SELECT public.auth_is_admin()))
    WITH CHECK ((SELECT public.auth_is_admin()));
