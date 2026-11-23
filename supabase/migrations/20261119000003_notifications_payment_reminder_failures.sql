CREATE TABLE public.notifications_payment_reminder_failures (
  client_id       uuid PRIMARY KEY,
  attempt_day     date NOT NULL,
  attempts        integer NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  last_error      text NOT NULL CHECK (char_length(last_error) BETWEEN 1 AND 501),
  last_failed_at  timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications_payment_reminder_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_payment_reminder_failures_select_staff"
  ON public.notifications_payment_reminder_failures FOR SELECT TO authenticated
  USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_payment_reminder_failures_insert_staff"
  ON public.notifications_payment_reminder_failures FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_payment_reminder_failures_update_staff"
  ON public.notifications_payment_reminder_failures FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_payment_reminder_failures_delete_staff"
  ON public.notifications_payment_reminder_failures FOR DELETE TO authenticated
  USING ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_payment_reminder_failures FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications_payment_reminder_failures TO authenticated;
