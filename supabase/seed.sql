-- Datos de prueba SOLO para desarrollo local. El CLI corre este archivo en `supabase db reset`.
-- No es una migración a propósito: las migraciones corren también en producción y estas clientas
-- son ficticias.

-- Clientas dadas de alta a mano por la administradora (US-CLI-05): no tienen cuenta, por eso
-- user_id es NULL, y nacen con el teléfono verificado por ella (criterio 4).
INSERT INTO public.clients_profiles (id, user_id, full_name, email, phone, phone_verified, notes)
VALUES
    ('00000000-0000-4000-a000-000000000001', NULL, 'María Fernández Rojas',  'maria.fernandez@correo.com',   '+506 8888 1234', true, 'Prefiere citas por la tarde. Llegó por Instagram.'),
    ('00000000-0000-4000-a000-000000000002', NULL, 'Ana Lucía Vargas Mora',  'analucia.vargas@correo.com',   '+506 7012 5566', true, 'Alérgica al adhesivo con formaldehído.'),
    ('00000000-0000-4000-a000-000000000003', NULL, 'Gabriela Solano Ureña',  'gabriela.solano@correo.com',   '+506 6244 9080', true, NULL),
    ('00000000-0000-4000-a000-000000000004', NULL, 'Karla Jiménez Castro',   'karla.jimenez@correo.com',     '+506 8391 4477', true, 'Referida por María Fernández.'),
    ('00000000-0000-4000-a000-000000000005', NULL, 'Sofía Ramírez Alvarado', 'sofia.ramirez@correo.com',     '+506 7155 3021', true, 'Cancela seguido. Confirmar el día antes.')
ON CONFLICT (id) DO NOTHING;
