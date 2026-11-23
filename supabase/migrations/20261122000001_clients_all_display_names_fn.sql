-- 20261122000001_clients_all_display_names_fn.sql
-- US-NOT-06 · feature clients — el nombre de todas las clientas que la sesión puede ver (contrato:
-- docs/contracts/clients-api.md). La lista de clientas inactivas de notifications incluye a las que nunca
-- vinieron, que no aparecen en ninguna función de scheduling: sin esto no tendría de dónde sacar sus ids.
-- Misma forma de fila que clients_display_names y, como ella, sin datos de contacto (garantía 2 del contrato).
-- SECURITY INVOKER y STABLE: la RLS de clients_profiles decide qué se ve (el personal, todas; una clienta, la
-- suya) y la función no agrega permisos. anon no la ejecuta. No pagina ni filtra: lo hace quien la consume.
-- Cumplimiento: ARCH-005, INT-003, SEC-001, SEC-006, INT-008.

CREATE FUNCTION public.clients_all_display_names()
RETURNS TABLE (client_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.full_name
    FROM public.clients_profiles c;
$$;

REVOKE ALL ON FUNCTION public.clients_all_display_names() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clients_all_display_names() FROM anon;
GRANT EXECUTE ON FUNCTION public.clients_all_display_names() TO authenticated;
