-- 20261020000000_scheduling_manual_blocks_unblock_and_appointments.sql
-- US-AGE-07 · feature scheduling — desbloquear un espacio (criterio 3) y no bloquear un espacio
-- que tiene una cita activa sin resolverla primero (criterio 4).
-- Se apoya en 20261015000000_scheduling_availability.sql (US-AGE-01), que dejó
-- scheduling_manual_blocks sin DELETE a propósito para esta historia, y en el modelo de citas de
-- US-AGE-09 (20261014000000 y 20261014000001).
-- Para los bloqueos manuales reemplaza la advertencia con confirmación de US-AGE-05 (criterio 9,
-- trasladado de US-AGE-01): ahora la base rechaza el bloqueo y la cita hay que resolverla antes.
-- Cerrar un día y quitar un bloque semanal siguen con la advertencia.
-- Cumplimiento: SEC-001 (RLS: solo staff borra), SEC-002 (pgTAP
--   scheduling_manual_blocks_unblock.test.sql), DOM-010 (la garantía vive en la base),
--   DOM-012 (no se cancela ninguna cita sola: el bloqueo se rechaza), INT-008.

-- 1. Desbloquear (criterio 3): solo staff. Sin UPDATE: cambiar un bloqueo es borrarlo y crearlo.
CREATE POLICY "scheduling_manual_blocks_delete_staff"
  ON public.scheduling_manual_blocks FOR DELETE TO authenticated
  USING (public.auth_is_staff());

-- 2. Un bloqueo no puede cruzarse con una cita activa (los estados que ocupan espacio en el
--    constraint de no-solape de US-AGE-09). Resolver la cita (rechazarla, cancelarla…) la saca de
--    esos estados y libera el espacio para bloquearlo.
--    Toma el mismo lock por recurso que scheduling_book_appointment (US-AGE-05), que a su vez
--    rechaza un espacio bloqueado: una reserva y un bloqueo del mismo recurso nunca corren a la
--    vez, y el segundo ve al primero.
--    SECURITY DEFINER para ver todas las citas aunque cambie la RLS de lectura; solo lee.
--    AFTER INSERT y no BEFORE: el WITH CHECK de RLS y los CHECK de la tabla se evalúan antes de
--    los triggers AFTER, así que quien no es staff choca con RLS y nunca llega a esta consulta.
--    Con un trigger BEFORE, una clienta que intentaba insertar recibía este error o el de RLS
--    según hubiera o no una cita, y con eso podía leer al minuto el final de una cita ajena
--    (y por la duración, el servicio) y distinguir una cita de un bloqueo (SEC-001).
CREATE FUNCTION public.scheduling_manual_block_rejects_active_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || NEW.resource_id::text, 0));

  IF EXISTS (
    SELECT 1
      FROM public.scheduling_appointments a
     WHERE a.resource_id = NEW.resource_id
       AND a.status IN ('pending_approval', 'approved', 'confirmed')
       AND a.occupied_range && tstzrange(NEW.starts_at, NEW.ends_at)
  ) THEN
    -- El mensaje es estable: el repositorio lo reconoce para dar un error tipado.
    RAISE EXCEPTION 'scheduling_manual_blocks_active_appointment'
      USING ERRCODE = '23514',
            DETAIL = 'El espacio tiene una cita activa; hay que resolverla antes de bloquearlo.';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_manual_block_rejects_active_appointment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_manual_block_rejects_active_appointment() FROM anon;

CREATE TRIGGER scheduling_manual_blocks_no_active_appointment
  AFTER INSERT ON public.scheduling_manual_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.scheduling_manual_block_rejects_active_appointment();
