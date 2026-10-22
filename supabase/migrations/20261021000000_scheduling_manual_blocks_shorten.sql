-- 20261021000000_scheduling_manual_blocks_shorten.sql
-- US-AGE-07 · feature scheduling — liberar el final de un bloqueo (criterio 3). Un bloqueo de
-- 08:00 a 11:00 se acorta a 08:00-10:00 sin borrarlo entero ni dejar la hora en manos de quien
-- escribe: el cliente manda un fin nuevo calculado de a espacios de 30 minutos.
-- Se apoya en 20261015000000_scheduling_availability.sql y en
-- 20261020000000_scheduling_manual_blocks_unblock_and_appointments.sql, que dejó scheduling_manual_blocks
-- sin UPDATE a propósito: cambiar un bloqueo es borrarlo y crearlo. Esta función hace las dos cosas
-- en una sola transacción, con las políticas de DELETE e INSERT de staff, sin abrir un UPDATE.
-- Cumplimiento: SEC-001 (SECURITY INVOKER: RLS decide quién puede; no hay SECURITY DEFINER),
--   SEC-002 (pgTAP scheduling_manual_blocks_shorten.test.sql), DOM-010 (la garantía vive en la
--   base), INT-008.

-- Solo acorta: el fin nuevo tiene que quedar después del inicio y antes del fin actual. Alargar o
-- mover un bloqueo no se puede por aquí (eso sí podría cruzar una cita), y liberar todo es
-- desbloquear. Conserva el id, el motivo y la fecha de creación. Toma el mismo lock por recurso que la reserva y el
-- trigger de bloqueos; acortar nunca agrega espacio ocupado, así que el trigger AFTER INSERT de
-- citas activas vuelve a pasar sin sorpresas.
CREATE FUNCTION public.scheduling_shorten_manual_block(p_block_id uuid, p_new_ends_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_block public.scheduling_manual_blocks%ROWTYPE;
BEGIN
  SELECT * INTO v_block FROM public.scheduling_manual_blocks WHERE id = p_block_id;
  IF NOT FOUND THEN
    -- RLS esconde los bloqueos a quien no es staff: para ella tampoco existe.
    RAISE EXCEPTION 'scheduling_manual_block_not_found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || v_block.resource_id::text, 0));

  IF p_new_ends_at IS NULL OR p_new_ends_at <= v_block.starts_at OR p_new_ends_at >= v_block.ends_at THEN
    RAISE EXCEPTION 'scheduling_manual_block_not_shortened'
      USING ERRCODE = '22023',
            DETAIL = 'El fin nuevo tiene que quedar después del inicio y antes del fin actual.';
  END IF;

  DELETE FROM public.scheduling_manual_blocks WHERE id = p_block_id;
  INSERT INTO public.scheduling_manual_blocks (id, resource_id, starts_at, ends_at, reason, created_at)
  VALUES (v_block.id, v_block.resource_id, v_block.starts_at, p_new_ends_at, v_block.reason, v_block.created_at);
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_shorten_manual_block(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_shorten_manual_block(uuid, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_shorten_manual_block(uuid, timestamptz) TO authenticated;
