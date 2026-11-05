-- 20261102000000_scheduling_close_appointment_package.sql
-- US-AGE-12 · feature scheduling — el cierre de la cita entiende las citas de paquete (US-AGE-04).
-- Una cita de paquete guarda package_id/package_name y deja technique_id/technique_name en NULL
-- (20261030000001). El cierre de 20261031000001 solo leía la técnica: el servicio prestado y el evento
-- de la bitácora quedaban sin nombre, y un servicio prestado distinto habría cobrado el precio de una
-- técnica suelta sobre un paquete.
-- Ahora el nombre del servicio prestado y el del evento es el de la técnica o, si no hay, el del paquete,
-- y un paquete solo se cierra tal cual se reservó: pedir otro servicio prestado se rechaza con
-- scheduling_technique_not_available. El cargo sigue siendo el precio congelado en la cita (DOM-002).
-- Misma firma que la función anterior: CREATE OR REPLACE conserva sus permisos. Forward-only (INT-008).
-- Cumplimiento: DOM-002, DOM-012, SEC-001, INT-008.

CREATE OR REPLACE FUNCTION public.scheduling_close_appointment(
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

    IF p_delivered_technique_id IS NOT NULL AND v_appointment.package_id IS NOT NULL THEN
      RAISE EXCEPTION 'scheduling_technique_not_available';
    END IF;

    v_is_reserved := p_delivered_technique_id IS NULL
                     OR p_delivered_technique_id IS NOT DISTINCT FROM v_appointment.technique_id;
    IF v_is_reserved THEN
      v_delivered_id   := v_appointment.technique_id;
      v_delivered_name := coalesce(v_appointment.technique_name, v_appointment.package_name);
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
      'reservedTechniqueName',   coalesce(v_appointment.technique_name, v_appointment.package_name),
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
