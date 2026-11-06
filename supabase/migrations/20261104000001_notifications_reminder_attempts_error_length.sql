ALTER TABLE public.notifications_reminder_attempts
  ADD CONSTRAINT notifications_reminder_attempts_error_length
    CHECK (char_length(error) <= 501);
