-- 20261020000001_scheduling_manual_blocks_reason_length.sql
-- US-AGE-07 · feature scheduling — tope de 500 caracteres al motivo de un bloqueo manual, el
-- mismo que tiene el motivo de una decisión de cita (20261014000002). La UI y el dominio ya lo
-- aplican (MAX_MANUAL_BLOCK_REASON_LENGTH); la base lo garantiza para cualquier otro camino.
-- NOT VALID: rige para todo bloqueo nuevo sin revisar los que ya existen, así la migración no
-- falla si algún motivo anterior pasa del tope. Validarlo después es un cambio aparte.
-- Cumplimiento: DOM-007 (el invariante también vive en la base), INT-008 (una migración por PR,
--   forward-only, sin cambio destructivo).

ALTER TABLE public.scheduling_manual_blocks
  ADD CONSTRAINT scheduling_manual_blocks_reason_max_length
  CHECK (reason IS NULL OR char_length(reason) <= 500) NOT VALID;
