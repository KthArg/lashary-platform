CREATE TABLE public.notifications_dropped_notices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL,
  action         text NOT NULL CHECK (action IN (
                   'scheduling.appointment.cancelled',
                   'scheduling.appointment.rescheduled',
                   'scheduling.appointment.reschedule_reverted',
                   'scheduling.appointment.reschedule_expired')),
  appointment_id uuid,
  error          text NOT NULL CHECK (length(error) BETWEEN 1 AND 500),
  attempts       integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz,

  CONSTRAINT notifications_dropped_notices_one_per_event UNIQUE (event_id)
);

CREATE INDEX idx_notifications_dropped_notices_open ON public.notifications_dropped_notices (created_at) WHERE resolved_at IS NULL;

ALTER TABLE public.notifications_dropped_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_dropped_notices_select_staff"
  ON public.notifications_dropped_notices FOR SELECT TO authenticated USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_dropped_notices_update_staff"
  ON public.notifications_dropped_notices FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_dropped_notices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications_dropped_notices TO authenticated;
GRANT UPDATE (resolved_at) ON public.notifications_dropped_notices TO authenticated;

CREATE FUNCTION public.notifications_log_dropped_notice(
  p_event_id       uuid,
  p_action         text,
  p_appointment_id uuid,
  p_error          text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications_dropped_notices (event_id, action, appointment_id, error)
  VALUES (p_event_id, p_action, p_appointment_id, left(coalesce(nullif(btrim(p_error), ''), 'sin detalle'), 500))
  ON CONFLICT (event_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_log_dropped_notice(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.notifications_discard_client_notices(p_appointment_id uuid, p_up_to timestamptz)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.notifications_client_notices WHERE appointment_id = p_appointment_id AND created_at <= p_up_to;
$$;

REVOKE ALL ON FUNCTION public.notifications_discard_client_notices(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.scheduling_register_appointment_change(p_event public.audit_events)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id    uuid;
  v_client_name  text;
  v_service_name text;
BEGIN
  SELECT a.client_id INTO v_client_id
    FROM public.scheduling_appointments a
   WHERE a.id = p_event.entity_id;
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  SELECT names.full_name INTO v_client_name
    FROM public.clients_display_names(ARRAY[v_client_id]) AS names;
  v_client_name  := coalesce(nullif(btrim(v_client_name), ''), 'Clienta');
  v_service_name := coalesce(nullif(btrim(p_event.payload ->> 'techniqueName'), ''), 'Servicio');

  IF p_event.action = 'scheduling.appointment.cancelled' THEN
    PERFORM public.notifications_record_cancellation(
      p_event.id,
      p_event.entity_id,
      v_client_name,
      v_service_name,
      coalesce((p_event.payload ->> 'heldStartsAt')::timestamptz, (p_event.payload ->> 'startsAt')::timestamptz),
      coalesce((p_event.payload ->> 'forfeitedDeposit')::bigint, 0)
    );
  ELSE
    PERFORM public.notifications_record_reschedule(
      p_event.id,
      p_event.entity_id,
      v_client_name,
      v_service_name,
      (p_event.payload ->> 'previousStartsAt')::timestamptz,
      (p_event.payload ->> 'newStartsAt')::timestamptz
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_register_appointment_change(public.audit_events) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.scheduling_register_reschedule_outcome(p_event public.audit_events)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id    uuid;
  v_service_name text;
BEGIN
  SELECT a.client_id, coalesce(a.technique_name, a.package_name) INTO v_client_id, v_service_name
    FROM public.scheduling_appointments a
   WHERE a.id = p_event.entity_id;
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.notifications_record_reschedule_outcome(
    p_event.id,
    CASE p_event.action
      WHEN 'scheduling.appointment.reschedule_reverted' THEN 'reschedule_rejected'
      ELSE 'reschedule_expired'
    END,
    p_event.entity_id,
    v_client_id,
    coalesce(nullif(btrim(v_service_name), ''), 'Servicio'),
    coalesce((p_event.payload ->> 'rejectedStartsAt')::timestamptz, (p_event.payload ->> 'expiredStartsAt')::timestamptz),
    (p_event.payload ->> 'restoredStartsAt')::timestamptz
  );
END;
$$;

REVOKE ALL ON FUNCTION public.scheduling_register_reschedule_outcome(public.audit_events) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.scheduling_notify_appointment_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.scheduling_register_appointment_change(NEW);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'scheduling_notify_appointment_changed: no se registró el aviso del evento % (%): %', NEW.id, NEW.action, SQLERRM;
  BEGIN
    PERFORM public.notifications_log_dropped_notice(NEW.id, NEW.action, NEW.entity_id, left(SQLERRM, 500));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'no se pudo registrar el aviso perdido del evento %: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.scheduling_notify_reschedule_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.scheduling_register_reschedule_outcome(NEW);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'scheduling_notify_reschedule_outcome: no se registró el aviso del evento % (%): %', NEW.id, NEW.action, SQLERRM;
  BEGIN
    PERFORM public.notifications_log_dropped_notice(NEW.id, NEW.action, NEW.entity_id, left(SQLERRM, 500));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'no se pudo registrar el aviso perdido del evento %: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.scheduling_discard_superseded_client_notices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.notifications_discard_client_notices(NEW.entity_id, NEW.created_at);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'scheduling_discard_superseded_client_notices: no se descartó el aviso de la cita % (evento %): %', NEW.entity_id, NEW.id, SQLERRM;
  BEGIN
    PERFORM public.notifications_log_dropped_notice(NEW.id, NEW.action, NEW.entity_id, left(SQLERRM, 500));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'no se pudo registrar el aviso perdido del evento %: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

DROP FUNCTION public.notifications_discard_client_notices(uuid);
