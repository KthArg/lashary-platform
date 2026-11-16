-- 20261108000005_delinquency_review_notice.sql
-- US-MOR-01 · features notifications y delinquency — aviso en la bandeja de la administradora cuando se
-- detecta una morosidad por revisar (criterio 3: la administradora recibe un aviso de qué clientas están por
-- quedar bloqueadas, con opción de confirmar o descartar; la decisión se toma en /admin/morosidades).
-- Sigue el patrón de scheduling: `delinquency` no escribe en la tabla de otra feature (ARCH-005); un disparador
-- propio, sobre sus morosidades, llama a la función de contrato de `notifications` que registra el aviso, y
-- un fallo al registrarlo nunca bloquea la detección (queda en el log, como en scheduling).
-- La bandeja nació para avisos de una cita (servicio y hora). El aviso de morosidad no tiene ninguno de los
-- dos: lleva lo que debe la clienta. `service_name` y `starts_at` pasan a ser opcionales y la combinación
-- válida de columnas queda fijada por tipo de aviso. Una sola migración hacia adelante (INT-008): ningún dato
-- existente cambia y las filas de los avisos anteriores siguen cumpliendo la restricción nueva.
-- Una morosidad por revisar deja un solo aviso (`event_id` único = id de la morosidad).
-- Cumplimiento: ARCH-005, DOM-012, SEC-001, SEC-002, INT-003, INT-008.

ALTER TABLE public.notifications_admin_inbox
  ADD COLUMN pending_amount bigint CHECK (pending_amount IS NULL OR pending_amount > 0),
  ALTER COLUMN service_name DROP NOT NULL,
  ALTER COLUMN starts_at DROP NOT NULL;

ALTER TABLE public.notifications_admin_inbox DROP CONSTRAINT notifications_admin_inbox_kind_check;
ALTER TABLE public.notifications_admin_inbox ADD CONSTRAINT notifications_admin_inbox_kind_check
  CHECK (kind IN ('booking_created', 'appointment_cancelled', 'appointment_rescheduled', 'delinquency_review'));

ALTER TABLE public.notifications_admin_inbox DROP CONSTRAINT notifications_admin_inbox_fields_by_kind;
ALTER TABLE public.notifications_admin_inbox ADD CONSTRAINT notifications_admin_inbox_fields_by_kind CHECK (
  (kind = 'booking_created'
    AND event_id IS NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NULL AND pending_amount IS NULL
    AND service_name IS NOT NULL AND starts_at IS NOT NULL)
  OR (kind = 'appointment_cancelled'
    AND event_id IS NOT NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NOT NULL AND pending_amount IS NULL
    AND service_name IS NOT NULL AND starts_at IS NOT NULL)
  OR (kind = 'appointment_rescheduled'
    AND event_id IS NOT NULL AND previous_starts_at IS NOT NULL AND forfeited_deposit IS NULL AND pending_amount IS NULL
    AND service_name IS NOT NULL AND starts_at IS NOT NULL)
  OR (kind = 'delinquency_review'
    AND event_id IS NOT NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NULL AND pending_amount IS NOT NULL
    AND service_name IS NULL AND starts_at IS NULL)
);

CREATE FUNCTION public.notifications_record_delinquency_review(
  p_case_id        uuid,
  p_appointment_id uuid,
  p_client_name    text,
  p_pending        bigint
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.notifications_admin_inbox (kind, event_id, appointment_id, client_name, pending_amount)
  VALUES ('delinquency_review', p_case_id, p_appointment_id, p_client_name, p_pending)
  ON CONFLICT (event_id) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.notifications_record_delinquency_review(uuid, uuid, text, bigint)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.delinquency_notify_case_detected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_name text;
BEGIN
  SELECT names.full_name INTO v_client_name
    FROM public.clients_display_names(ARRAY[NEW.client_id]) AS names;
  v_client_name := coalesce(nullif(btrim(v_client_name), ''), 'Clienta');

  PERFORM public.notifications_record_delinquency_review(NEW.id, NEW.appointment_id, v_client_name, NEW.pending);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'delinquency_notify_case_detected: no se registró el aviso de la morosidad %: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_notify_case_detected() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER delinquency_cases_notify_detected
  AFTER INSERT ON public.delinquency_cases
  FOR EACH ROW
  WHEN (NEW.state = 'pending_review')
  EXECUTE FUNCTION public.delinquency_notify_case_detected();
