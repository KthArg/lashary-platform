-- 20261105010002_notifications_confirmation_requests.sql
-- US-NOT-08 · feature notifications — criterio 1: una solicitud de confirmación por cita y horario, que
-- el cron manda a la clienta. Sin FK a `scheduling_appointments` ni a `clients_profiles`, igual que
-- `notifications_reminders`: es un registro operativo de envíos (ARCH-005).
-- `notifications_record_confirmation_request` y `notifications_cancel_confirmation_request` son el
-- contrato con `scheduling` (docs/contracts/scheduling-api.md). Ningún rol de la API las ejecuta.
-- Una solicitud cancelada del mismo horario vuelve a quedar pendiente: pasa si un reagendado se rechaza
-- antes de que saliera el mensaje.
-- `notifications_claim_confirmation_requests` reclama en tandas con `FOR UPDATE SKIP LOCKED` (DOM-010) y
-- retoma lo reclamado por una corrida que murió. No reclama citas que ya empezaron: si el cron estuvo
-- detenido, el mensaje ya no sirve.
-- Cumplimiento: ARCH-005, ARCH-006, DOM-003, DOM-010, SEC-001, SEC-002, PERF-003, INT-003, INT-008.

CREATE TABLE public.notifications_confirmation_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  client_id      uuid NOT NULL,
  starts_at      timestamptz NOT NULL,
  service_name   text NOT NULL CHECK (length(btrim(service_name)) > 0),
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'claimed', 'sent', 'failed', 'cancelled')),
  claimed_at     timestamptz,
  attempts       integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error     text,
  last_channel   text CHECK (last_channel IN ('whatsapp', 'email')),
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_confirmation_requests_one_per_schedule UNIQUE (appointment_id, starts_at)
);

CREATE INDEX idx_notifications_confirmation_requests_status ON public.notifications_confirmation_requests (status, created_at);

ALTER TABLE public.notifications_confirmation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_confirmation_requests_select_staff"
  ON public.notifications_confirmation_requests FOR SELECT TO authenticated
  USING ((SELECT public.auth_is_staff()));

CREATE POLICY "notifications_confirmation_requests_update_staff"
  ON public.notifications_confirmation_requests FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_confirmation_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications_confirmation_requests TO authenticated;
GRANT UPDATE (status, claimed_at, attempts, last_error, last_channel, sent_at)
  ON public.notifications_confirmation_requests TO authenticated;

CREATE FUNCTION public.notifications_record_confirmation_request(
  p_appointment_id uuid,
  p_client_id      uuid,
  p_starts_at      timestamptz,
  p_service_name   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications_confirmation_requests (appointment_id, client_id, starts_at, service_name)
  VALUES (p_appointment_id, p_client_id, p_starts_at, p_service_name)
  ON CONFLICT (appointment_id, starts_at) DO UPDATE
    SET status = 'pending', claimed_at = NULL, attempts = 0, last_error = NULL
    WHERE public.notifications_confirmation_requests.status = 'cancelled';
END;
$$;

CREATE FUNCTION public.notifications_cancel_confirmation_request(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.notifications_confirmation_requests
     SET status = 'cancelled', claimed_at = NULL
   WHERE appointment_id = p_appointment_id
     AND status IN ('pending', 'claimed');
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_record_confirmation_request(uuid, uuid, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notifications_cancel_confirmation_request(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.notifications_claim_confirmation_requests(
  p_now               timestamptz,
  p_batch_size        integer,
  p_claim_ttl_minutes integer
)
RETURNS SETOF public.notifications_confirmation_requests
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_batch_size IS NULL OR p_batch_size <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_confirmation_requests: p_batch_size debe ser un entero positivo (llegó %)', p_batch_size;
  END IF;
  IF p_claim_ttl_minutes IS NULL OR p_claim_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_confirmation_requests: p_claim_ttl_minutes debe ser un entero positivo (llegó %)', p_claim_ttl_minutes;
  END IF;

  RETURN QUERY
  WITH due AS MATERIALIZED (
    SELECT id FROM public.notifications_confirmation_requests
    WHERE starts_at > p_now
      AND (status = 'pending'
           OR (status = 'claimed' AND claimed_at < p_now - make_interval(mins => p_claim_ttl_minutes)))
    ORDER BY created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.notifications_confirmation_requests AS request
  SET status = 'claimed', claimed_at = p_now
  FROM due
  WHERE request.id = due.id
  RETURNING request.*;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_claim_confirmation_requests(timestamptz, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifications_claim_confirmation_requests(timestamptz, integer, integer) TO authenticated;
