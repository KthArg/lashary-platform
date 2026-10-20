-- 20261019000000_payments_deposit_due_fn.sql
-- US-AGE-05 · feature payments — contrato SQL para reservar: el anticipo que de verdad se cobra.
-- Recibe el anticipo de la técnica y devuelve 0 si la clienta tiene una exoneración vigente, o el
-- mismo anticipo si no. scheduling no lee payments_deposit_exemptions: llama a esta función
-- (ARCH-005, INT-003).
-- Ningún rol de la API la ejecuta: recibe un id de clienta, y si pudiera llamarla cualquiera, una
-- clienta sabría quién está exonerada (SEC-005). La llaman, con el id sacado de la sesión, las
-- funciones de reserva de scheduling, que corren como el dueño de la base. Corre con los permisos
-- de quien llama (SECURITY INVOKER): no eleva nada.
-- Cumplimiento: ARCH-005, DOM-002, SEC-001, SEC-005, INT-008 (una migración, forward-only).

CREATE FUNCTION public.payments_deposit_due(p_client_id uuid, p_deposit bigint)
RETURNS bigint
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
           WHEN EXISTS (
             SELECT 1
               FROM public.payments_deposit_exemptions e
              WHERE e.client_id = p_client_id
                AND e.active
           ) THEN 0::bigint
           ELSE p_deposit
         END;
$$;

REVOKE ALL ON FUNCTION public.payments_deposit_due(uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.payments_deposit_due(uuid, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.payments_deposit_due(uuid, bigint) FROM authenticated;
REVOKE ALL ON FUNCTION public.payments_deposit_due(uuid, bigint) FROM service_role;
