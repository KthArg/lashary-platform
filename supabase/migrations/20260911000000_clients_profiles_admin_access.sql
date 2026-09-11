-- Acceso de la administradora a public.clients_profiles (US-CLI-05, criterios 1 y 2) (SEC-001, ARCH-005)
-- Las políticas vigentes (_own) solo dejan a cada usuaria su propia fila: la administradora no ve
-- ninguna clienta ni puede crear las que no tienen cuenta (user_id NULL). Estas se suman a las
-- existentes; Postgres combina las políticas permisivas con OR, así que la clienta no pierde nada.

-- Contrato de auth: clients no consulta auth_user_roles directamente (ARCH-005), le pregunta a esta
-- función. SECURITY DEFINER para que el resultado no dependa de las políticas de auth_user_roles.
CREATE OR REPLACE FUNCTION public.auth_is_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.auth_user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'superadmin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.auth_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;

-- (SELECT ...) hace que Postgres evalúe la función una vez por consulta y no una vez por fila.
-- Sin política de DELETE a propósito: la historia no pide borrar clientas.
CREATE POLICY "clients_profiles_select_admin" ON public.clients_profiles FOR SELECT TO authenticated USING ((SELECT public.auth_is_admin()));
CREATE POLICY "clients_profiles_insert_admin" ON public.clients_profiles FOR INSERT TO authenticated WITH CHECK ((SELECT public.auth_is_admin()));
CREATE POLICY "clients_profiles_update_admin" ON public.clients_profiles FOR UPDATE TO authenticated USING ((SELECT public.auth_is_admin())) WITH CHECK ((SELECT public.auth_is_admin()));
