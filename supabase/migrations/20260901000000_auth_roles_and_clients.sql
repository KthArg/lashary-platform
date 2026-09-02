-- Roles de usuario, tabla de clientes y políticas RLS (SEC-001, SEC-003, ARCH-006)
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'cliente');

CREATE TABLE IF NOT EXISTS public.auth_user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role public.app_role NOT NULL DEFAULT 'cliente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.auth_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_user_roles_select_own" ON public.auth_user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.clients_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_clients_profiles_user_id ON public.clients_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_profiles_phone ON public.clients_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_clients_profiles_email ON public.clients_profiles(email);

ALTER TABLE public.clients_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_profiles_select_own" ON public.clients_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "clients_profiles_insert_own" ON public.clients_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_profiles_update_own" ON public.clients_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.auth_user_roles (user_id, role) VALUES (new.id, 'cliente') ON CONFLICT (user_id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();
