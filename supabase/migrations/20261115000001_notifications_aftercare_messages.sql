CREATE TABLE public.notifications_aftercare_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  client_id      uuid NOT NULL,
  service_name   text NOT NULL CHECK (length(btrim(service_name)) > 0),
  aftercare_text text NOT NULL CHECK (length(btrim(aftercare_text)) > 0),
  client_note    text CHECK (client_note IS NULL OR (length(btrim(client_note)) > 0 AND char_length(client_note) <= 1000)),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'failed')),
  claimed_at     timestamptz,
  attempts       integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error     text,
  last_channel   text CHECK (last_channel IN ('whatsapp', 'email')),
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_aftercare_messages_one_per_appointment UNIQUE (appointment_id)
);

CREATE INDEX idx_notifications_aftercare_messages_client ON public.notifications_aftercare_messages (client_id, created_at DESC);
CREATE INDEX idx_notifications_aftercare_messages_pending ON public.notifications_aftercare_messages (status, created_at);

ALTER TABLE public.notifications_aftercare_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_aftercare_messages_select_own"
  ON public.notifications_aftercare_messages FOR SELECT TO authenticated
  USING (client_id = (SELECT public.clients_current_profile_id()));
CREATE POLICY "notifications_aftercare_messages_select_staff"
  ON public.notifications_aftercare_messages FOR SELECT TO authenticated USING ((SELECT public.auth_is_staff()));
CREATE POLICY "notifications_aftercare_messages_update_staff"
  ON public.notifications_aftercare_messages FOR UPDATE TO authenticated
  USING ((SELECT public.auth_is_staff())) WITH CHECK ((SELECT public.auth_is_staff()));

REVOKE ALL ON public.notifications_aftercare_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, appointment_id, client_id, service_name, aftercare_text, client_note, status, last_channel, sent_at, created_at)
  ON public.notifications_aftercare_messages TO authenticated;
GRANT UPDATE (status, claimed_at, attempts, last_error, last_channel, sent_at)
  ON public.notifications_aftercare_messages TO authenticated;

CREATE FUNCTION public.notifications_record_aftercare(
  p_appointment_id uuid,
  p_client_id      uuid,
  p_technique_id   uuid,
  p_package_id     uuid,
  p_service_name   text,
  p_client_note    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  trimmed_note  text := NULLIF(btrim(p_client_note), '');
  source_count  integer;
  message_text  text;
BEGIN
  IF p_appointment_id IS NULL OR p_client_id IS NULL OR length(btrim(coalesce(p_service_name, ''))) = 0 THEN
    RAISE EXCEPTION 'notifications_aftercare_invalid';
  END IF;
  IF char_length(trimmed_note) > 1000 THEN
    RAISE EXCEPTION 'notifications_aftercare_note_too_long';
  END IF;

  SELECT count(*),
         CASE WHEN count(*) = 1 THEN min(source.aftercare_text)
              ELSE string_agg(source.technique_name || E'\n' || source.aftercare_text, E'\n\n' ORDER BY source.position)
         END
    INTO source_count, message_text
    FROM public.catalog_service_aftercare(p_technique_id, p_package_id) WITH ORDINALITY AS source(technique_name, aftercare_text, position);

  IF source_count = 0 THEN
    RAISE EXCEPTION 'notifications_aftercare_text_missing';
  END IF;

  INSERT INTO public.notifications_aftercare_messages (appointment_id, client_id, service_name, aftercare_text, client_note)
  VALUES (p_appointment_id, p_client_id, btrim(p_service_name), message_text, trimmed_note)
  ON CONFLICT (appointment_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_record_aftercare(uuid, uuid, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.notifications_claim_aftercare_messages(
  p_now               timestamptz,
  p_batch_size        integer,
  p_claim_ttl_minutes integer
)
RETURNS SETOF public.notifications_aftercare_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (SELECT public.auth_is_staff()) THEN
    RAISE EXCEPTION 'notifications_claim_aftercare_messages: solo el personal puede reclamar indicaciones' USING ERRCODE = '42501';
  END IF;
  IF p_batch_size IS NULL OR p_batch_size <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_aftercare_messages: p_batch_size debe ser un entero positivo (llegó %)', p_batch_size;
  END IF;
  IF p_claim_ttl_minutes IS NULL OR p_claim_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'notifications_claim_aftercare_messages: p_claim_ttl_minutes debe ser un entero positivo (llegó %)', p_claim_ttl_minutes;
  END IF;

  RETURN QUERY
  WITH due AS MATERIALIZED (
    SELECT m.id FROM public.notifications_aftercare_messages m
    WHERE m.status = 'pending'
       OR (m.status = 'claimed' AND m.claimed_at < p_now - make_interval(mins => p_claim_ttl_minutes))
    ORDER BY m.created_at
    LIMIT p_batch_size
    FOR UPDATE OF m SKIP LOCKED
  )
  UPDATE public.notifications_aftercare_messages AS message
  SET status = 'claimed', claimed_at = p_now
  FROM due
  WHERE message.id = due.id
  RETURNING message.*;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_claim_aftercare_messages(timestamptz, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifications_claim_aftercare_messages(timestamptz, integer, integer) TO authenticated;
