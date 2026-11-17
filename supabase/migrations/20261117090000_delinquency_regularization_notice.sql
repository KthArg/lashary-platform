-- 20261117090000_delinquency_regularization_notice.sql
-- US-MOR-03 · features delinquency y notifications — aviso a la bandeja de la administradora cuando una clienta
-- envía un comprobante (contrato: docs/contracts/delinquency-api.md, «Aviso a la bandeja cuando llega un
-- comprobante»). Mismo camino que el aviso de una morosidad por revisar (20261108000005).
-- - notifications: el tipo `regularization_submitted` en `notifications_admin_inbox`, con lo que declaró la
--   clienta en una columna propia (`declared_amount`; `pending_amount` es lo que debe y no se mezcla). Lleva la
--   solicitud como `event_id` (un aviso por solicitud) y la cita de la morosidad; no lleva servicio ni hora.
-- - notifications_record_regularization_submitted: sin EXECUTE para nadie con sesión; la llama solo el trigger.
-- - delinquency: el trigger de `delinquency_regularizations`, al insertarse una pendiente, pide el nombre a
--   clients_display_names (ARCH-005; «Clienta» si no hay) y registra el aviso. Si registrar el aviso falla, la
--   solicitud se crea igual y el fallo queda en el log.
-- La clienta no recibe aviso: ve el estado en su estado de cuenta. WhatsApp y correo quedan como deuda.
-- Cumplimiento: ARCH-005, DOM-011, SEC-001, SEC-002, INT-003, INT-008.

ALTER TABLE public.notifications_admin_inbox
  ADD COLUMN declared_amount bigint CHECK (declared_amount IS NULL OR declared_amount > 0);

ALTER TABLE public.notifications_admin_inbox DROP CONSTRAINT notifications_admin_inbox_kind_check;
ALTER TABLE public.notifications_admin_inbox ADD CONSTRAINT notifications_admin_inbox_kind_check
  CHECK (kind IN ('booking_created', 'appointment_cancelled', 'appointment_rescheduled', 'delinquency_review',
                  'regularization_submitted'));

ALTER TABLE public.notifications_admin_inbox DROP CONSTRAINT notifications_admin_inbox_fields_by_kind;
ALTER TABLE public.notifications_admin_inbox ADD CONSTRAINT notifications_admin_inbox_fields_by_kind CHECK (
  (kind = 'booking_created'
    AND event_id IS NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NULL AND pending_amount IS NULL
    AND declared_amount IS NULL AND service_name IS NOT NULL AND starts_at IS NOT NULL)
  OR (kind = 'appointment_cancelled'
    AND event_id IS NOT NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NOT NULL AND pending_amount IS NULL
    AND declared_amount IS NULL AND service_name IS NOT NULL AND starts_at IS NOT NULL)
  OR (kind = 'appointment_rescheduled'
    AND event_id IS NOT NULL AND previous_starts_at IS NOT NULL AND forfeited_deposit IS NULL AND pending_amount IS NULL
    AND declared_amount IS NULL AND service_name IS NOT NULL AND starts_at IS NOT NULL)
  OR (kind = 'delinquency_review'
    AND event_id IS NOT NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NULL AND pending_amount IS NOT NULL
    AND declared_amount IS NULL AND service_name IS NULL AND starts_at IS NULL)
  OR (kind = 'regularization_submitted'
    AND event_id IS NOT NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NULL AND pending_amount IS NULL
    AND declared_amount IS NOT NULL AND service_name IS NULL AND starts_at IS NULL)
);

CREATE FUNCTION public.notifications_record_regularization_submitted(
  p_request_id      uuid,
  p_appointment_id  uuid,
  p_client_name     text,
  p_declared_amount bigint
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.notifications_admin_inbox (kind, event_id, appointment_id, client_name, declared_amount)
  VALUES ('regularization_submitted', p_request_id, p_appointment_id, p_client_name, p_declared_amount)
  ON CONFLICT (event_id) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.notifications_record_regularization_submitted(uuid, uuid, text, bigint)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.delinquency_notify_regularization_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_appointment_id uuid;
  v_client_name    text;
BEGIN
  SELECT c.appointment_id INTO v_appointment_id FROM public.delinquency_cases c WHERE c.id = NEW.case_id;
  SELECT names.full_name INTO v_client_name
    FROM public.clients_display_names(ARRAY[NEW.client_id]) AS names;
  v_client_name := coalesce(nullif(btrim(v_client_name), ''), 'Clienta');
  PERFORM public.notifications_record_regularization_submitted(NEW.id, v_appointment_id, v_client_name, NEW.declared_amount);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'delinquency_notify_regularization_submitted: no se registró el aviso de la solicitud %: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_notify_regularization_submitted() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER delinquency_regularizations_notify_submitted
  AFTER INSERT ON public.delinquency_regularizations
  FOR EACH ROW
  WHEN (NEW.state = 'pending_approval')
  EXECUTE FUNCTION public.delinquency_notify_regularization_submitted();
