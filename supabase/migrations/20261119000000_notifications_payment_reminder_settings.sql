CREATE TABLE public.notifications_payment_reminder_settings (
  singleton      boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  id             uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  frequency_days integer NOT NULL DEFAULT 7 CHECK (frequency_days BETWEEN 1 AND 30)
);

INSERT INTO public.notifications_payment_reminder_settings (singleton) VALUES (true);

ALTER TABLE public.notifications_payment_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_payment_reminder_settings_select_staff"
  ON public.notifications_payment_reminder_settings
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

REVOKE ALL ON public.notifications_payment_reminder_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications_payment_reminder_settings TO authenticated;
