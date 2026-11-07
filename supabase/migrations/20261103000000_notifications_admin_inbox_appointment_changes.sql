ALTER TABLE public.notifications_admin_inbox
  ADD COLUMN event_id           uuid,
  ADD COLUMN previous_starts_at timestamptz,
  ADD COLUMN forfeited_deposit  bigint CHECK (forfeited_deposit IS NULL OR forfeited_deposit >= 0);

ALTER TABLE public.notifications_admin_inbox DROP CONSTRAINT notifications_admin_inbox_kind_check;
ALTER TABLE public.notifications_admin_inbox ADD CONSTRAINT notifications_admin_inbox_kind_check
  CHECK (kind IN ('booking_created', 'appointment_cancelled', 'appointment_rescheduled'));

ALTER TABLE public.notifications_admin_inbox ADD CONSTRAINT notifications_admin_inbox_fields_by_kind CHECK (
  (kind = 'booking_created'
    AND event_id IS NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NULL)
  OR (kind = 'appointment_cancelled'
    AND event_id IS NOT NULL AND previous_starts_at IS NULL AND forfeited_deposit IS NOT NULL)
  OR (kind = 'appointment_rescheduled'
    AND event_id IS NOT NULL AND previous_starts_at IS NOT NULL AND forfeited_deposit IS NULL)
);

ALTER TABLE public.notifications_admin_inbox DROP CONSTRAINT notifications_admin_inbox_one_per_event;
CREATE UNIQUE INDEX notifications_admin_inbox_one_per_booking
  ON public.notifications_admin_inbox (appointment_id) WHERE kind = 'booking_created';
ALTER TABLE public.notifications_admin_inbox ADD CONSTRAINT notifications_admin_inbox_one_per_event UNIQUE (event_id);

CREATE OR REPLACE FUNCTION public.notifications_record_booking(
  p_appointment_id uuid,
  p_client_name    text,
  p_service_name   text,
  p_starts_at      timestamptz
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.notifications_admin_inbox (kind, appointment_id, client_name, service_name, starts_at)
  VALUES ('booking_created', p_appointment_id, p_client_name, p_service_name, p_starts_at)
  ON CONFLICT (appointment_id) WHERE kind = 'booking_created' DO NOTHING;
$$;

CREATE FUNCTION public.notifications_record_cancellation(
  p_event_id          uuid,
  p_appointment_id    uuid,
  p_client_name       text,
  p_service_name      text,
  p_starts_at         timestamptz,
  p_forfeited_deposit bigint
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.notifications_admin_inbox
    (kind, event_id, appointment_id, client_name, service_name, starts_at, forfeited_deposit)
  VALUES
    ('appointment_cancelled', p_event_id, p_appointment_id, p_client_name, p_service_name, p_starts_at, p_forfeited_deposit)
  ON CONFLICT (event_id) DO NOTHING;
$$;

CREATE FUNCTION public.notifications_record_reschedule(
  p_event_id           uuid,
  p_appointment_id     uuid,
  p_client_name        text,
  p_service_name       text,
  p_previous_starts_at timestamptz,
  p_starts_at          timestamptz
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.notifications_admin_inbox
    (kind, event_id, appointment_id, client_name, service_name, previous_starts_at, starts_at)
  VALUES
    ('appointment_rescheduled', p_event_id, p_appointment_id, p_client_name, p_service_name, p_previous_starts_at, p_starts_at)
  ON CONFLICT (event_id) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.notifications_record_booking(uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notifications_record_cancellation(uuid, uuid, text, text, timestamptz, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notifications_record_reschedule(uuid, uuid, text, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
