-- 20261108000006_delinquency_set_grace_days_fn.sql
-- US-MOR-01 · feature delinquency — la administradora cambia el periodo de gracia (criterio 2: «existe un
-- periodo de gracia configurable»). De 1 a 90 días, aprobado por el PO (Kenny, 2026-11-08). Cambiarlo rige solo
-- para las detecciones nuevas: no toca las morosidades que ya existen.
-- La tabla de configuración no se escribe directo (ni la administradora): esta función es la única vía, para que
-- cada cambio deje su evento en la bitácora en la misma transacción (DOM-011), con el valor anterior y el nuevo.
-- Poner el mismo valor que ya hay no cambia nada y no deja evento. Devuelve el valor que quedó.
-- SECURITY DEFINER porque delinquency_settings no tiene escritura directa; solo admin la llama.
-- Cumplimiento: ARCH-006, DOM-011, DOM-012, SEC-001, SEC-002, INT-008.

CREATE FUNCTION public.delinquency_set_grace_days(p_days integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.delinquency_settings;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'delinquency_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 90 THEN
    RAISE EXCEPTION 'delinquency_invalid_grace_days' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_settings
    FROM public.delinquency_settings
   WHERE singleton
   FOR UPDATE;

  IF v_settings.grace_days = p_days THEN
    RETURN p_days;
  END IF;

  UPDATE public.delinquency_settings SET grace_days = p_days WHERE singleton;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    'delinquency.settings.grace_days_changed',
    'delinquency_settings',
    v_settings.id,
    jsonb_build_object('previousGraceDays', v_settings.grace_days, 'graceDays', p_days)
  );

  RETURN p_days;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_set_grace_days(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_set_grace_days(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_set_grace_days(integer) TO authenticated;
