-- Datos de desarrollo: 5 clientas sin cuenta para ver /admin/clients con datos reales (US-CLI-05).
-- Solo local: `supabase db reset` lo aplica después de las migraciones. No es una migración (INT-008)
-- y no se corre en producción. Teléfonos en la forma de normalizePhone (+506 + 8 dígitos) y
-- phone_verified = true, como un alta hecha por la administradora (criterio 4).
-- Sin datos sensibles en las notas: alergias y tratamientos son expediente (SEC-006).
INSERT INTO public.clients_profiles (full_name, email, phone, phone_verified, notes)
SELECT v.full_name, v.email, v.phone, true, v.notes
FROM (VALUES
  ('María Fernández Rojas', 'maria.fernandez@correo.com', '+50688881234', 'Prefiere citas por la tarde.'),
  ('Ana Lucía Vargas Mora', 'analucia.vargas@correo.com', '+50670125566', NULL),
  ('Gabriela Solano Ureña', 'gabriela.solano@correo.com', '+50662449080', 'Llegó por Instagram.'),
  ('Karla Jiménez Castro', 'karla.jimenez@correo.com', '+50683914477', 'Referida por María Fernández.'),
  ('Daniela Chaves Brenes', 'daniela.chaves@correo.com', '+50671203344', NULL)
) AS v(full_name, email, phone, notes)
-- Idempotente: correrlo dos veces no duplica teléfonos (criterio 3).
WHERE NOT EXISTS (SELECT 1 FROM public.clients_profiles c WHERE c.phone = v.phone);
