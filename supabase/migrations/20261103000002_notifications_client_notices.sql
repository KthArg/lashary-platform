CREATE TABLE public.notifications_client_notices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                text NOT NULL CHECK (kind IN ('reschedule_rejected', 'reschedule_expired')),
  event_id            uuid NOT NULL,
  appointment_id      uuid NOT NULL,
  client_id           uuid NOT NULL,
  service_name        text NOT NULL CHECK (length(btrim(service_name)) > 0),
  requested_starts_at timestamptz NOT NULL,
  kept_starts_at      timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'failed')),
  claimed_at          timestamptz,
  attempts            integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error          text,
  last_channel        text CHECK (last_channel IN ('whatsapp', 'email')),
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_client_notices_one_per_event UNIQUE (event_id)
);

CREATE INDEX idx_notifications_client_notices_client ON public.notifications_client_notices (client_id, created_at DESC);
CREATE INDEX idx_notifications_client_notices_pending ON public.notifications_client_notices (status, created_at);

ALTER TABLE public.notifications_client_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_client_notices_select_own"
  ON public.notifications_client_notices FOR SELECT TO authenticated
  USING (client_id = (SELECT public.clients_current_profile_id()));
CREATE POLICY "notifications_client_notices_select_staff"
  ON public.notifications_client_notices FOR SELECT TO authenticated USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_client_notices_update_staff"
  ON public.notifications_client_notices FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_client_notices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications_client_notices TO authenticated;
GRANT UPDATE (status, claimed_at, attempts, last_error, last_channel, sent_at)
  ON public.notifications_client_notices TO authenticated;

CREATE FUNCTION public.notifications_record_reschedule_outcome(
  p_event_id            uuid,
  p_kind                text,
  p_appointment_id      uuid,
  p_client_id           uuid,
  p_service_name        text,
  p_requested_starts_at timestamptz,
  p_kept_starts_at      timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_kind = 'reschedule_expired' THEN
    DELETE FROM public.notifications_client_notices
     WHERE appointment_id = p_appointment_id
       AND kind = 'reschedule_rejected'
       AND status = 'pending'
       AND created_at = now();
  END IF;

  INSERT INTO public.notifications_client_notices
    (kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at)
  VALUES
    (p_kind, p_event_id, p_appointment_id, p_client_id, p_service_name, p_requested_starts_at, p_kept_starts_at)
  ON CONFLICT (event_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_record_reschedule_outcome(uuid, text, uuid, uuid, text, timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
