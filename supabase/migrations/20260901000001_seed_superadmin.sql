-- Migración: Restricción de unicidad para el rol superadmin (SEC-001, ARCH-006)
-- Garantiza a nivel de base de datos que solo puede existir un único 'superadmin' en el sistema.
CREATE UNIQUE INDEX IF NOT EXISTS idx_only_one_superadmin 
ON public.auth_user_roles (role) WHERE (role = 'superadmin');
