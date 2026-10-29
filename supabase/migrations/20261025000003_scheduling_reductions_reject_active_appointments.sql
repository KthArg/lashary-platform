-- 20261025000003_scheduling_reductions_reject_active_appointments.sql
-- US-AGE-07 · cerrar un día y quitar un bloque semanal con citas activas se rechazan en la base,
-- igual que bloquear un espacio (criterio 4): la garantía no depende de la acción ni del conteo
-- previo (DOM-010, SEC-001, INT-008).

-- 1. Cerrar un día: AFTER INSERT, para que RLS responda 42501 a quien no es staff antes de que el
--    trigger lea citas. Mismo lock por recurso que la reserva. El día va de medianoche a
--    medianoche en la zona del estudio y solo cuentan citas que todavía no terminaron.
CREATE FUNCTION public.scheduling_closed_date_rejects_active_appointment()
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
       AND a.ends_at > now()
       AND a.occupied_range && tstzrange(
             NEW.closed_on::timestamp AT TIME ZONE 'America/Costa_Rica',
             (NEW.closed_on + 1)::timestamp AT TIME ZONE 'America/Costa_Rica')
  ) THEN
    RAISE EXCEPTION 'scheduling_closed_dates_active_appointment'
      USING ERRCODE = '23514',
            DETAIL = 'Ese día tiene una cita activa; hay que resolverla antes de cerrarlo.';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_closed_date_rejects_active_appointment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_closed_date_rejects_active_appointment() FROM anon;

CREATE TRIGGER scheduling_closed_dates_no_active_appointment
  AFTER INSERT ON public.scheduling_closed_dates
  FOR EACH ROW
  EXECUTE FUNCTION public.scheduling_closed_date_rejects_active_appointment();

-- 2. Quitar un bloque semanal: BEFORE DELETE, con el conteo que ya usa el panel. Corre con los
--    permisos de quien borra: RLS ya filtró las filas, así que una clienta no llega aquí.
CREATE FUNCTION public.scheduling_weekly_block_rejects_active_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('scheduling_resource:' || OLD.resource_id::text, 0));

  IF public.scheduling_count_appointments_affected_by_weekly_block(OLD.id) > 0 THEN
    RAISE EXCEPTION 'scheduling_weekly_availability_active_appointments'
      USING ERRCODE = '23514',
            DETAIL = 'Ese bloque tiene citas activas; hay que resolverlas antes de quitarlo.';
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_weekly_block_rejects_active_appointments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_weekly_block_rejects_active_appointments() FROM anon;

CREATE TRIGGER scheduling_weekly_availability_no_active_appointments
  BEFORE DELETE ON public.scheduling_weekly_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.scheduling_weekly_block_rejects_active_appointments();
