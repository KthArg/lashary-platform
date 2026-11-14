-- 20261113000002_notifications_reapplication_settings.sql
-- US-NOT-05 · feature notifications — criterio 3: «la administradora configura con cuántos días de
-- anticipación se envía» el aviso de re-aplicación. De 1 a 30 días, 7 por defecto: aprobado por el
-- líder del proyecto (2026-11-13, docs/process/DEPENDENCIES.md), mismo patrón que la gracia de
-- US-MOR-01 (delinquency_settings) y el plazo de US-NOT-08 (scheduling_confirmation_policy).
-- La tabla no se escribe directo: solo la función de la siguiente pieza, para que cada cambio deje
-- su evento en la bitácora en la misma transacción.
-- Cumplimiento: ARCH-006, SEC-001, SEC-002, INT-008.

CREATE TABLE public.notifications_reapplication_settings (
  singleton         boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  -- Identifica la configuración en la bitácora (audit_events.entity_id es uuid).
  id                uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  anticipation_days integer NOT NULL DEFAULT 7 CHECK (anticipation_days BETWEEN 1 AND 30)
);

INSERT INTO public.notifications_reapplication_settings (singleton) VALUES (true);

ALTER TABLE public.notifications_reapplication_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_reapplication_settings_select_staff"
  ON public.notifications_reapplication_settings
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

REVOKE ALL ON public.notifications_reapplication_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications_reapplication_settings TO authenticated;
