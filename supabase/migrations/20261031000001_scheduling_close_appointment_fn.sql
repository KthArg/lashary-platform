-- 20261031000001_scheduling_close_appointment_fn.sql
-- US-AGE-12 · feature scheduling — la administradora cierra una cita pasada: completada o ausencia.
-- Cerrar, registrar el cargo en el ledger de payments y dejar el evento en la bitácora son una sola
-- transacción: si algo falla, la cita sigue sin cerrar. La función corre con los permisos del dueño
-- porque la política de staff solo deja actualizar citas pendientes; ella misma exige staff.
-- Una cita cerrada no vuelve a otro estado: staff no tiene política de UPDATE sobre ella.
-- Ausencia sin aviso: el anticipo registrado se pierde como registro en el evento; no hay cargo ni
-- se mueve dinero (decisión del 2026-10-31, pendiente de aprobación del PO, DOM-012).
-- El cargo de una cita completada es el precio congelado en la cita si se prestó el servicio reservado
-- (DOM-002) o el precio del catálogo del servicio prestado si difiere; el anticipo registrado se
-- descuenta en un asiento aparte (DOM-005). El ledger lo escribe payments (ARCH-005).
-- Cumplimiento: ARCH-005, DOM-002, DOM-005, DOM-012, SEC-001, SEC-002, PERF-003, INT-003, INT-008.

ALTER TABLE public.scheduling_appointments
  ADD COLUMN closed_by                uuid REFERENCES auth.users(id),
  ADD COLUMN closed_at                timestamptz,
  ADD COLUMN delivered_technique_id   uuid,
  ADD COLUMN delivered_technique_name text,
  ADD CONSTRAINT scheduling_appointments_closing_complete CHECK ((closed_by IS NULL) = (closed_at IS NULL));

CREATE INDEX idx_scheduling_appointments_closed_by
  ON public.scheduling_appointments (closed_by) WHERE closed_by IS NOT NULL;

CREATE FUNCTION public.scheduling_close_appointment(
  p_appointment_id         uuid,
  p_outcome                text,
  p_delivered_technique_id uuid DEFAULT NULL
)
RETURNS TABLE (
  appointment_id    uuid,
  outcome           text,
  charge_amount     bigint,
  deposit_credit    bigint,
  amount_due        bigint,
  forfeited_deposit bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_appointment      public.scheduling_appointments;
  v_terms            record;
  v_is_reserved      boolean;
  v_delivered_id     uuid;
  v_delivered_name   text;
  v_charge           bigint := 0;
  v_deposit_credit   bigint := 0;
  v_amount_due       bigint := 0;
  v_forfeited        bigint := 0;
BEGIN
  IF NOT public.auth_is_staff() THEN
    RAISE EXCEPTION 'scheduling_not_staff' USING ERRCODE = '42501';
  END IF;

  IF p_outcome IS NULL OR p_outcome NOT IN ('completed', 'no_show') THEN
    RAISE EXCEPTION 'scheduling_close_outcome_invalid';
  END IF;

  SELECT * INTO v_appointment
    FROM public.scheduling_appointments a
   WHERE a.id = p_appointment_id
     FOR UPDATE;
  IF NOT FOUND
     OR v_appointment.status NOT IN ('approved', 'confirmed')
     OR v_appointment.ends_at > now() THEN
    RAISE EXCEPTION 'scheduling_appointment_not_closable';
  END IF;

  IF p_outcome = 'completed' THEN
    IF v_appointment.service_price IS NULL OR v_appointment.client_id IS NULL THEN
      RAISE EXCEPTION 'scheduling_appointment_not_chargeable';
    END IF;

    v_is_reserved := p_delivered_technique_id IS NULL
                     OR p_delivered_technique_id IS NOT DISTINCT FROM v_appointment.technique_id;
    IF v_is_reserved THEN
      v_delivered_id   := v_appointment.technique_id;
      v_delivered_name := v_appointment.technique_name;
      v_charge         := v_appointment.service_price;
    ELSE
      SELECT * INTO v_terms
        FROM public.catalog_booking_terms(p_delivered_technique_id, coalesce(v_appointment.is_first_time, true));
      IF NOT FOUND OR v_terms.price IS NULL OR v_terms.price <= 0 THEN
        RAISE EXCEPTION 'scheduling_technique_not_available';
      END IF;
      v_delivered_id   := v_terms.technique_id;
      v_delivered_name := v_terms.name;
      v_charge         := v_terms.price;
    END IF;

    v_deposit_credit := v_appointment.deposit_registered;
    v_amount_due := public.payments_record_close_entries(
      v_appointment.client_id, v_appointment.id, v_charge, v_deposit_credit);
  ELSE
    v_forfeited := v_appointment.deposit_registered;
  END IF;

  UPDATE public.scheduling_appointments a
     SET status                  = p_outcome,
         closed_by               = auth.uid(),
         closed_at               = now(),
         delivered_technique_id   = v_delivered_id,
         delivered_technique_name = v_delivered_name
   WHERE a.id = v_appointment.id;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  VALUES (
    auth.uid(),
    CASE p_outcome WHEN 'completed' THEN 'scheduling.appointment.completed'
                   ELSE 'scheduling.appointment.no_show' END,
    'scheduling_appointment',
    v_appointment.id,
    jsonb_build_object(
      'previousStatus',          v_appointment.status,
      'startsAt',                v_appointment.starts_at,
      'reservedTechniqueName',   v_appointment.technique_name,
      'deliveredTechniqueName',  v_delivered_name,
      'chargeAmount',            v_charge,
      'depositCredit',           v_deposit_credit,
      'amountDue',               v_amount_due,
      'forfeitedDeposit',        v_forfeited
    )
  );

  RETURN QUERY SELECT v_appointment.id, p_outcome, v_charge, v_deposit_credit, v_amount_due, v_forfeited;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_close_appointment(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scheduling_close_appointment(uuid, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scheduling_close_appointment(uuid, text, uuid) TO authenticated;
