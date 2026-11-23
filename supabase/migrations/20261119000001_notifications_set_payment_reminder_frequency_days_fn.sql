CREATE FUNCTION public.notifications_set_payment_reminder_frequency_days(p_days integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.notifications_payment_reminder_settings;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'notifications_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 30 THEN
    RAISE EXCEPTION 'notifications_invalid_payment_reminder_frequency_days' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_settings
    FROM public.notifications_payment_reminder_settings
   WHERE singleton
   FOR UPDATE;

  IF v_settings.frequency_days = p_days THEN
    RETURN p_days;
  END IF;

  UPDATE public.notifications_payment_reminder_settings SET frequency_days = p_days WHERE singleton;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'notifications.settings.payment_reminder_frequency_days_changed',
    'notifications_payment_reminder_settings',
    v_settings.id,
    jsonb_build_object('previousFrequencyDays', v_settings.frequency_days, 'frequencyDays', p_days)
  );

  RETURN p_days;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_set_payment_reminder_frequency_days(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notifications_set_payment_reminder_frequency_days(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.notifications_set_payment_reminder_frequency_days(integer) TO authenticated;
