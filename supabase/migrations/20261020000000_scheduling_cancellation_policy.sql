-- 20261020000000_scheduling_cancellation_policy.sql
-- US-AGE-06 · feature scheduling — ventana de cancelación que configura la administradora (criterio 1).
-- Una clienta que cancela con al menos esas horas de antelación no pierde nada; si cancela con menos,
-- el anticipo se da por perdido (DOM-012: consecuencia pendiente de aprobación del PO). Arranca en 48
-- horas, el ejemplo del criterio, que el PO debe confirmar.
-- Vive en una tabla de una sola fila y no en TypeScript porque la clienta cancelará llamando una
-- función directo por PostgREST (SEC-001); y en una tabla, y no escrita en la función, para cambiarla
-- con un UPDATE sin migración, igual que el tope de citas pendientes. 0 significa sin ventana: cancelar
-- nunca pierde el anticipo.
-- Cumplimiento: DOM-012, SEC-001, SEC-002, INT-008 (una migración, forward-only).

CREATE TABLE public.scheduling_cancellation_policy (
  singleton                 boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  cancellation_window_hours integer NOT NULL CHECK (cancellation_window_hours >= 0)
);

INSERT INTO public.scheduling_cancellation_policy (singleton, cancellation_window_hours) VALUES (true, 48);

ALTER TABLE public.scheduling_cancellation_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_cancellation_policy_select_staff"
  ON public.scheduling_cancellation_policy
  FOR SELECT
  TO authenticated
  USING (public.auth_is_staff());

CREATE POLICY "scheduling_cancellation_policy_update_admin"
  ON public.scheduling_cancellation_policy
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

REVOKE ALL ON public.scheduling_cancellation_policy FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.scheduling_cancellation_policy TO authenticated;
GRANT UPDATE (cancellation_window_hours) ON public.scheduling_cancellation_policy TO authenticated;
