-- Capacidad base de bloqueo manual puntual (US-AGE-01, pieza 3/3), ARCH-006, SEC-001.
-- La UX completa (seleccionar varios, desbloquear, impedir bloquear sobre una cita existente)
-- es alcance de US-AGE-07, que depende de esta historia.
CREATE TABLE public.scheduling_manual_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.scheduling_resources(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_scheduling_manual_blocks_resource_id ON public.scheduling_manual_blocks(resource_id);

ALTER TABLE public.scheduling_manual_blocks ENABLE ROW LEVEL SECURITY;

-- Lectura pública: el calendario público (US-AGE-02) la necesita incluso sin sesión.
CREATE POLICY "scheduling_manual_blocks_select_all" ON public.scheduling_manual_blocks FOR SELECT TO anon, authenticated USING (true);

-- Escritura solo admin/superadmin (SEC-001). scheduling no consulta auth_user_roles directamente
-- (ARCH-005): le pregunta a public.auth_is_admin(), ya establecida en 20260911000000.
CREATE POLICY "scheduling_manual_blocks_write_admin" ON public.scheduling_manual_blocks FOR ALL TO authenticated
    USING ((SELECT public.auth_is_admin()))
    WITH CHECK ((SELECT public.auth_is_admin()));
