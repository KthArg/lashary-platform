-- 20261113000003_notifications_set_reapplication_anticipation_days_fn.sql
-- US-NOT-05 · feature notifications — la administradora cambia la anticipación (criterio 3: «la
-- administradora configura con cuántos días de anticipación se envía»). De 1 a 30 días, aprobado
-- por el líder del proyecto (2026-11-13).
-- La tabla de configuración no se escribe directo (ni la administradora): esta función es la única
-- vía, para que cada cambio deje su evento en la bitácora en la misma transacción, con el valor
-- anterior y el nuevo. Poner el mismo valor que ya hay no cambia nada y no deja evento. Devuelve el
-- valor que quedó. Mismo patrón que delinquency_set_grace_days (US-MOR-01).
-- SECURITY DEFINER porque notifications_reapplication_settings no tiene escritura directa; solo
-- admin la llama.
-- Cumplimiento: ARCH-006, DOM-012, SEC-001, SEC-002, INT-008.

CREATE FUNCTION public.notifications_set_reapplication_anticipation_days(p_days integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.notifications_reapplication_settings;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'notifications_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 30 THEN
    RAISE EXCEPTION 'notifications_invalid_anticipation_days' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_settings
    FROM public.notifications_reapplication_settings
   WHERE singleton
   FOR UPDATE;

  IF v_settings.anticipation_days = p_days THEN
    RETURN p_days;
  END IF;

  UPDATE public.notifications_reapplication_settings SET anticipation_days = p_days WHERE singleton;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'notifications.settings.reapplication_anticipation_days_changed',
    'notifications_reapplication_settings',
    v_settings.id,
    jsonb_build_object('previousAnticipationDays', v_settings.anticipation_days, 'anticipationDays', p_days)
  );

  RETURN p_days;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_set_reapplication_anticipation_days(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notifications_set_reapplication_anticipation_days(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.notifications_set_reapplication_anticipation_days(integer) TO authenticated;
