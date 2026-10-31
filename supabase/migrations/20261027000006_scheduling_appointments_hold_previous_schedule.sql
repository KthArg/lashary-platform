-- 20261027000006_scheduling_appointments_hold_previous_schedule.sql
-- US-AGE-10 · feature scheduling — hallazgo A2 de la revisión (2026-10-27): rechazar un reagendado
-- devuelve la cita a su horario anterior. Para poder devolverla, el horario anterior no se suelta
-- mientras la administradora no decide: la cita guarda su inicio, fin, rango ocupado y estado previos
-- (`previous_*`) y ocupa los dos espacios a la vez.
-- `blocked_ranges` (columna generada) junta el rango vigente y el anterior, y el exclusion constraint de
-- no-solape pasa a mirarla: ninguna otra cita activa puede cruzar ninguno de los dos (DOM-010,
-- ADR-0002). Sin horario anterior, `blocked_ranges` es solo el rango vigente y el constraint se comporta
-- como antes. El constraint se reemplaza con el mismo nombre.
-- Los cuatro `previous_*` van juntos: o están todos o ninguno. Solo una cita aprobada o confirmada
-- guarda su horario (una pendiente que se reagenda no tiene nada aprobado que devolver).
-- Staff no los escribe: el UPDATE de staff ya está limitado a `status` y `decision_reason`, y una cita
-- nueva nace sin horario anterior (política de INSERT).
-- Cumplimiento: DOM-010, SEC-002, INT-008 (una migración, forward-only).

ALTER TABLE public.scheduling_appointments
  ADD COLUMN previous_starts_at      timestamptz,
  ADD COLUMN previous_ends_at        timestamptz,
  ADD COLUMN previous_occupied_range tstzrange,
  ADD COLUMN previous_status         text CHECK (previous_status IN ('approved', 'confirmed')),
  ADD CONSTRAINT scheduling_appointments_previous_schedule_complete CHECK (
    (previous_starts_at IS NULL) = (previous_ends_at IS NULL)
    AND (previous_starts_at IS NULL) = (previous_occupied_range IS NULL)
    AND (previous_starts_at IS NULL) = (previous_status IS NULL)
  ),
  ADD CONSTRAINT scheduling_appointments_previous_range_covers_service CHECK (
    previous_occupied_range IS NULL
    OR (lower(previous_occupied_range) <= previous_starts_at AND upper(previous_occupied_range) >= previous_ends_at)
  );

ALTER TABLE public.scheduling_appointments
  ADD COLUMN blocked_ranges tstzmultirange GENERATED ALWAYS AS (
    tstzmultirange(occupied_range) + COALESCE(tstzmultirange(previous_occupied_range), '{}'::tstzmultirange)
  ) STORED;

ALTER TABLE public.scheduling_appointments
  DROP CONSTRAINT scheduling_appointments_no_overlap;

ALTER TABLE public.scheduling_appointments
  ADD CONSTRAINT scheduling_appointments_no_overlap EXCLUDE USING gist (
    resource_id    WITH =,
    blocked_ranges WITH &&
  ) WHERE (status IN ('pending_approval', 'approved', 'confirmed'));

ALTER POLICY "scheduling_appointments_insert_staff"
  ON public.scheduling_appointments
  WITH CHECK (
    public.auth_is_staff()
    AND status = 'pending_approval'
    AND decided_by IS NULL AND decided_at IS NULL AND decision_reason IS NULL
    AND previous_status IS NULL
  );
