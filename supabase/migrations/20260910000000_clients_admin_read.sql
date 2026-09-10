-- US-CLI-05 criterio 2 — la administradora tiene que poder LEER clientas ajenas.
-- Las politicas vigentes de public.clients_profiles son todas `auth.uid() = user_id`, asi que sin
-- esto la administradora no ve ninguna fila y la pantalla no tiene datos que mostrar (SEC-001).
-- RLS no da error cuando filtra: devuelve cero filas, que es lo que hace peligroso olvidarla.

-- Contrato publicado por la feature `auth` (INT-003): el rol vive en public.auth_user_roles, tabla
-- de `auth`, y ARCH-005 prohibe que `clients` la consulte directo. Esta funcion es el unico punto
-- de acceso. Lleva el prefijo `auth_` porque su duena es esa feature (ARCH-006).
-- SECURITY DEFINER: auth_user_roles tiene RLS de "solo mi propia fila"; sin definer la funcion se
-- veria a si misma bloqueada al evaluarse dentro de una politica.
-- STABLE: se evalua una vez por consulta y no una vez por fila.
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.auth_user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    );
$$;

REVOKE ALL ON FUNCTION public.auth_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;

-- Politica PERMISIVA: se suma con OR a clients_profiles_select_own, no la reemplaza. Una clienta
-- sigue viendo unicamente su propia fila.
-- Solo SELECT: esta historia entrega la lectura. El alta y la edicion desde la administradora
-- necesitan sus propias politicas de INSERT/UPDATE y entran con su server action.
DROP POLICY IF EXISTS "clients_profiles_select_admin" ON public.clients_profiles;
CREATE POLICY "clients_profiles_select_admin" ON public.clients_profiles
    FOR SELECT TO authenticated
    USING (public.auth_is_admin());
