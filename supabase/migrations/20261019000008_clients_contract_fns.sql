-- 20261019000008_clients_contract_fns.sql
-- US-AGE-05 · feature clients — contrato SQL para que otras features identifiquen y nombren a una
-- clienta sin leer clients_profiles (ARCH-005, INT-003; hallazgo M2 de la auditoría).
-- scheduling necesita dos cosas: saber cuál es el perfil de la clienta de la sesión (al reservar,
-- cotizar y leer su historial) y mostrar de quién es una cita en la cola de aprobación. Hasta ahora
-- lo hacía con consultas directas a la tabla, de modo que un cambio del modelo de perfiles rompía
-- scheduling sin que ninguna prueba de clients lo notara.
-- Las dos funciones corren con los permisos de quien llama (SECURITY INVOKER): la RLS de
-- clients_profiles decide qué se ve. Una clienta solo alcanza su propio perfil y una administradora
-- alcanza todos; no se agrega ningún permiso nuevo ni se expone nada que la tabla no exponga ya.
-- Cumplimiento: ARCH-005, SEC-001, SEC-002, SEC-005, INT-003, INT-008 (una migración, forward-only).

CREATE FUNCTION public.clients_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.id
    FROM public.clients_profiles c
   WHERE c.user_id = auth.uid();
$$;

CREATE FUNCTION public.clients_display_names(p_client_ids uuid[])
RETURNS TABLE (client_id uuid, full_name text)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.full_name
    FROM public.clients_profiles c
   WHERE c.id = ANY (p_client_ids);
$$;

REVOKE ALL ON FUNCTION public.clients_current_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clients_current_profile_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.clients_current_profile_id() TO authenticated;

REVOKE ALL ON FUNCTION public.clients_display_names(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clients_display_names(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.clients_display_names(uuid[]) TO authenticated;
