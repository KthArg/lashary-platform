CREATE TABLE public.notifications_payment_reminders (
  client_id     uuid PRIMARY KEY,
  last_sent_at  timestamptz NOT NULL,
  last_amount   bigint NOT NULL CHECK (last_amount > 0),
  last_channel  text NOT NULL CHECK (last_channel IN ('whatsapp', 'email')),
  send_count    integer NOT NULL DEFAULT 1 CHECK (send_count >= 1),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications_payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_payment_reminders_select_staff"
  ON public.notifications_payment_reminders FOR SELECT TO authenticated
  USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_payment_reminders_insert_staff"
  ON public.notifications_payment_reminders FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_payment_reminders_update_staff"
  ON public.notifications_payment_reminders FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_payment_reminders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications_payment_reminders TO authenticated;
