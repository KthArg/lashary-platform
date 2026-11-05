-- 20261102000001_payments_ledger_write_only_through_close.sql
-- US-AGE-12 · features payments y scheduling — el ledger solo se escribe al cerrar una cita.
-- Hallazgos M3 y B4 del audit del 2026-11-01.
-- M3: la migración 20261031000000 dejaba a staff con INSERT directo sobre payments_ledger_entries y
-- con EXECUTE sobre payments_record_close_entries: un admin podía escribir cargos y créditos sin cerrar
-- la cita, sin evento en la bitácora, y un asiento suelto chocaba con el índice único
-- (appointment_id, kind) y bloqueaba el cierre real de esa cita. Ahora nadie con sesión escribe el
-- ledger: lo escribe scheduling_close_appointment, que es SECURITY DEFINER y corre con los permisos
-- del dueño, así que no necesita ninguno de esos permisos. La lectura de staff y el saldo no cambian.
-- B4: una cita con closed_at solo puede estar completada o en ausencia, y una ausencia no lleva servicio
-- prestado. El sentido contrario (estado terminal implica closed_at) queda sin forzar porque otras
-- historias siembran citas completadas sin cerrarlas; hoy lo garantiza solo la función de cierre.
-- Cumplimiento: DOM-005, SEC-001, INT-008 (forward-only).

DROP POLICY "payments_ledger_entries_insert_staff" ON public.payments_ledger_entries;

REVOKE INSERT (client_id, appointment_id, kind, amount) ON public.payments_ledger_entries FROM authenticated;
REVOKE INSERT ON public.payments_ledger_entries FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.payments_record_close_entries(uuid, uuid, bigint, bigint) FROM authenticated;

ALTER TABLE public.scheduling_appointments
  ADD CONSTRAINT scheduling_appointments_closed_is_terminal
    CHECK (closed_at IS NULL OR status IN ('completed', 'no_show')),
  ADD CONSTRAINT scheduling_appointments_no_show_without_service
    CHECK (status <> 'no_show' OR (delivered_technique_id IS NULL AND delivered_technique_name IS NULL));
