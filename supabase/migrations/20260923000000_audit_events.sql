-- 20260923000000_audit_events.sql
-- US-AGE-13 · feature audit — bitácora de auditoría append-only. Infraestructura sin historia
-- propia (ADR-0007): la porta esta historia y la reusan US-AGE-06/09/12, US-CLI-04, US-MOR-02/04/05.
-- Cumplimiento: ARCH-006 (prefijo audit_), DOM-003 (timestamptz UTC), SEC-001 (RLS es la
-- frontera real), SEC-002 (test de aislamiento en __tests__/ y supabase/tests/database/),
-- PERF-003 (columnas filtradas indexadas), INT-008 (una migración, forward-only).

CREATE TABLE public.audit_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quién hizo la acción. FK a auth.users: es infraestructura de Supabase que ya comparten
  -- todas las features (igual que clients_profiles.user_id), no la tabla de otra feature de
  -- dominio — no rompe ARCH-006. Sin actor de sistema todavía; se relaja en una migración
  -- forward cuando exista un evento disparado sin sesión humana.
  actor_id    uuid NOT NULL REFERENCES auth.users(id),

  -- Qué pasó: código estable que define quien emite el evento (p.ej.
  -- "payments.deposit_exemption.granted"). Texto libre a propósito, no enum: un enum forzaría
  -- a esta tabla compartida a migrar cada vez que otra feature agregue una acción nueva.
  action      text NOT NULL CHECK (length(btrim(action)) > 0),

  -- Sobre qué recurso — sin FK a propósito. Mismo principio que catalog_techniques ("sin FK a
  -- otras tablas"): esta tabla la escriben features distintas y no debe acoplarse al esquema
  -- de ninguna. entity_id se valida en el borde de quien emite el evento, no acá.
  entity_type text NOT NULL CHECK (length(btrim(entity_type)) > 0),
  entity_id   uuid NOT NULL,

  -- Detalle específico de la acción (p.ej. la razón de una exoneración).
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- UTC (DOM-003). El valor real lo fija el reloj inyectado en application/, no este default:
  -- el default solo cubre el caso borde de una fila escrita fuera de esa capa.
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Consultas esperadas: historial de un recurso, actividad de un actor, orden cronológico (PERF-003).
CREATE INDEX idx_audit_events_entity ON public.audit_events (entity_type, entity_id);
CREATE INDEX idx_audit_events_actor ON public.audit_events (actor_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events (created_at DESC);

-- RLS (SEC-001). Bitácora administrativa: ni lectura ni escritura son públicas.
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_events_select_staff"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "audit_events_insert_staff"
  ON public.audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_staff());

-- Deliberadamente SIN políticas de UPDATE ni DELETE: con RLS activo y ninguna política que las
-- cubra, la base deniega ambas a cualquier rol, staff incluida. La bitácora es append-only por
-- diseño a nivel de base de datos — ni la administradora puede alterar o borrar un asiento ya
-- escrito; una corrección solo puede ser un nuevo evento.
