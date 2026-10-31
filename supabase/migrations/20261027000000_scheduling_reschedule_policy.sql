-- 20261027000000_scheduling_reschedule_policy.sql
-- US-AGE-10 · feature scheduling — tope de reagendados por cita (criterio 5) y su contador.
-- El tope es global y lo cambia la administradora; el contador es de cada cita y lo sube la función
-- de reagendar de la pieza siguiente. Arranca en 1 reagendado por cita (decisión del PO, 2026-10-23);
-- 0 significa que reagendar está desactivado.
-- Vive en una tabla de una sola fila, como la ventana de cancelación, porque la clienta reagendará
-- llamando una función directo por PostgREST (SEC-001) y para cambiarlo sin migración.
-- Desde el inicio lo garantiza la base y no solo TypeScript (lo corregido en US-AGE-06):
-- 1. El tope máximo (10) es un `CHECK` de la tabla.
-- 2. El cambio es una función, `scheduling_change_reschedule_limit`, que valida, lee el valor anterior
--    con `FOR UPDATE`, actualiza y deja el evento en la misma transacción (INT-003).
-- 3. No hay `UPDATE` directo: la función es el único camino.
-- Cumplimiento: DOM-011, SEC-001, SEC-002, INT-003, INT-008 (una migración, forward-only).

CREATE TABLE public.scheduling_reschedule_policy (
  singleton       boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  max_reschedules integer NOT NULL CHECK (max_reschedules >= 0 AND max_reschedules <= 10)
);

INSERT INTO public.scheduling_reschedule_policy (singleton, max_reschedules) VALUES (true, 1);

ALTER TABLE public.scheduling_reschedule_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_reschedule_policy_select_staff"
  ON public.scheduling_reschedule_policy
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

REVOKE ALL ON public.scheduling_reschedule_policy FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.scheduling_reschedule_policy TO authenticated;

ALTER TABLE public.scheduling_appointments
  ADD COLUMN reschedule_count integer NOT NULL DEFAULT 0 CHECK (reschedule_count >= 0);

CREATE FUNCTION public.scheduling_change_reschedule_limit(p_max integer)
RETURNS TABLE (previous_max integer, new_max integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous integer;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'scheduling_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_max IS NULL OR p_max < 0 OR p_max > 10 THEN
    RAISE EXCEPTION 'scheduling_invalid_reschedule_limit';
  END IF;

  SELECT policy.max_reschedules INTO v_previous
    FROM public.scheduling_reschedule_policy policy
   WHERE policy.singleton
     FOR UPDATE;

  IF v_previous IS NULL THEN
    RAISE EXCEPTION 'scheduling_reschedule_policy_missing';
  END IF;

  IF v_previous <> p_max THEN
    UPDATE public.scheduling_reschedule_policy
       SET max_reschedules = p_max
     WHERE singleton;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'scheduling.reschedule_limit.changed',
      'scheduling_reschedule_policy',
      '00000000-0000-0000-0000-00000000c0a2',
      jsonb_build_object('previousMax', v_previous, 'newMax', p_max)
    );
  END IF;

  RETURN QUERY SELECT v_previous, p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_change_reschedule_limit(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_change_reschedule_limit(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_change_reschedule_limit(integer) TO authenticated;
