CREATE TABLE public.notifications_admin_inbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL CHECK (kind IN ('booking_created')),
  appointment_id uuid NOT NULL,
  client_name    text NOT NULL CHECK (length(btrim(client_name)) > 0),
  service_name   text NOT NULL CHECK (length(btrim(service_name)) > 0),
  starts_at      timestamptz NOT NULL,
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_admin_inbox_one_per_event UNIQUE (kind, appointment_id)
);

CREATE INDEX idx_notifications_admin_inbox_created_at ON public.notifications_admin_inbox (created_at DESC);

ALTER TABLE public.notifications_admin_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_admin_inbox_select_staff"
  ON public.notifications_admin_inbox FOR SELECT TO authenticated USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_admin_inbox_update_staff"
  ON public.notifications_admin_inbox FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_admin_inbox FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications_admin_inbox TO authenticated;
GRANT UPDATE (read_at) ON public.notifications_admin_inbox TO authenticated;

CREATE FUNCTION public.notifications_record_booking(
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
  ON CONFLICT (kind, appointment_id) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.notifications_record_booking(uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
