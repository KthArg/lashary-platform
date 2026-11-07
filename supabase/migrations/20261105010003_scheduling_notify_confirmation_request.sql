-- 20261105010003_scheduling_notify_confirmation_request.sql
-- US-NOT-08 · feature scheduling — criterio 1 con la decisión del PO del 2026-11-05: cuando una cita con
-- clienta pasa a `approved` se pide la confirmación, y cuando deja de estarlo se retira lo que no salió.
-- Va en un trigger para cubrir todos los caminos: aprobar, un reagendado que se aprueba o se rechaza y
-- uno que vence. Corre después de que `scheduling_settle_previous_schedule` devolvió la cita a su horario.
-- Si `notifications` falla, el trigger lo atrapa: el estado de la cita importa más que el mensaje
-- (docs/contracts/scheduling-api.md). El fallo deja `scheduling.confirmation_request.failed` en la
-- bitácora para que se vea qué citas quedaron sin solicitud; si la bitácora también falla, solo queda
-- el aviso del log.
-- Cumplimiento: ARCH-005, DOM-010, ADR-0003, INT-003, INT-008 (una migración, forward-only).

CREATE FUNCTION public.scheduling_notify_confirmation_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    PERFORM public.notifications_record_confirmation_request(
      NEW.id,
      NEW.client_id,
      NEW.starts_at,
      coalesce(nullif(btrim(coalesce(NEW.technique_name, NEW.package_name)), ''), 'Servicio')
    );
  ELSE
    PERFORM public.notifications_cancel_confirmation_request(NEW.id);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'scheduling_notify_confirmation_request: no se actualizó la solicitud de la cita %: %', NEW.id, SQLERRM;
  BEGIN
    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.confirmation_request.failed',
      'scheduling_appointment',
      NEW.id,
      jsonb_build_object('status', NEW.status, 'startsAt', NEW.starts_at, 'sqlstate', SQLSTATE)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'scheduling_notify_confirmation_request: tampoco quedó el rastro en la bitácora de la cita %: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_notify_confirmation_request() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER scheduling_appointments_notify_confirmation_request
  AFTER UPDATE OF status ON public.scheduling_appointments
  FOR EACH ROW
  WHEN (
    NEW.client_id IS NOT NULL
    AND OLD.status IS DISTINCT FROM NEW.status
    AND (NEW.status = 'approved' OR OLD.status = 'approved')
  )
  EXECUTE FUNCTION public.scheduling_notify_confirmation_request();
