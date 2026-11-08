CREATE TABLE public.clients_appointment_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.clients_profiles(id) ON DELETE RESTRICT,
  appointment_id  uuid NOT NULL,
  body            text NOT NULL CHECK (body = btrim(body) AND length(body) BETWEEN 1 AND 2000),
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_appointment_notes_appointment ON public.clients_appointment_notes (appointment_id);
CREATE INDEX idx_clients_appointment_notes_client ON public.clients_appointment_notes (client_id);
CREATE INDEX idx_clients_appointment_notes_created_by ON public.clients_appointment_notes (created_by);

CREATE FUNCTION public.clients_appointment_notes_belongs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.appointment_id IS DISTINCT FROM OLD.appointment_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'clients_appointment_notes: solo se puede cambiar el texto de una anotación'
        USING ERRCODE = '23514', CONSTRAINT = 'clients_appointment_notes_only_body_changes';
    END IF;
    RETURN NEW;
  END IF;

  IF public.scheduling_appointment_client(NEW.appointment_id) IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'clients_appointment_notes: la cita % no es de la clienta %', NEW.appointment_id, NEW.client_id
      USING ERRCODE = '23503', CONSTRAINT = 'clients_appointment_notes_appointment_of_client';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_appointment_notes_belongs
  BEFORE INSERT OR UPDATE ON public.clients_appointment_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.clients_appointment_notes_belongs();

CREATE FUNCTION public.clients_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_appointment_notes_set_updated_at
  BEFORE UPDATE ON public.clients_appointment_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.clients_set_updated_at();

ALTER TABLE public.clients_appointment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_appointment_notes_select_admin"
  ON public.clients_appointment_notes
  FOR SELECT
  TO authenticated
  USING ((SELECT public.auth_is_admin()));

CREATE POLICY "clients_appointment_notes_insert_admin"
  ON public.clients_appointment_notes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.auth_is_admin()) AND created_by = (SELECT auth.uid()));

CREATE POLICY "clients_appointment_notes_update_admin"
  ON public.clients_appointment_notes
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.auth_is_admin()))
  WITH CHECK ((SELECT public.auth_is_admin()));

CREATE POLICY "clients_appointment_notes_delete_admin"
  ON public.clients_appointment_notes
  FOR DELETE
  TO authenticated
  USING ((SELECT public.auth_is_admin()));

REVOKE ALL ON public.clients_appointment_notes FROM anon;
