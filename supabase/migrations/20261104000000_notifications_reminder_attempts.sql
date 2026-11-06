CREATE TABLE public.notifications_reminder_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id    uuid NOT NULL REFERENCES public.notifications_reminders (id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  channel        text CHECK (channel IN ('whatsapp', 'email')),
  outcome        text NOT NULL CHECK (outcome IN ('sent', 'failed', 'not_configured', 'no_contact')),
  error          text,
  attempted_at   timestamptz NOT NULL,

  CONSTRAINT notifications_reminder_attempts_channel_unless_no_contact
    CHECK ((channel IS NULL) = (outcome = 'no_contact')),
  CONSTRAINT notifications_reminder_attempts_error_unless_sent
    CHECK ((error IS NULL) = (outcome = 'sent'))
);

CREATE INDEX idx_notifications_reminder_attempts_reminder ON public.notifications_reminder_attempts (reminder_id, attempted_at);

ALTER TABLE public.notifications_reminder_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_reminder_attempts_select_staff"
  ON public.notifications_reminder_attempts FOR SELECT TO authenticated
  USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_reminder_attempts_insert_staff"
  ON public.notifications_reminder_attempts FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_reminder_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.notifications_reminder_attempts TO authenticated;
