-- supabase/seed.sql — datos de desarrollo. Se cargan con `supabase db reset`.
-- Una técnica por familia de servicio (criterio 2 de US-AGE-08).
-- Valores ilustrativos para desarrollo — no son los precios reales del negocio.

INSERT INTO public.catalog_techniques
  (name, family, price_first_time, price_retouch,
   duration_first_time_min, duration_retouch_min, buffer_min,
   reapplication_interval_days, deposit, aftercare_text)
VALUES
  ('Set clásico', 'lash_classic',
   25000, 15000, 120, 75, 15, 21, 10000,
   'No mojar las pestañas por 24 horas. Evitar sauna y vapor por 48 horas. Cepillar a diario con el cepillo entregado.'),

  ('Set volumen', 'lash_volume',
   32000, 19000, 150, 90, 15, 21, 12000,
   'No mojar las pestañas por 24 horas. Evitar productos oleosos en el área de los ojos. Cepillar a diario.'),

  ('Set volumen extra', 'lash_extra_volume',
   38000, 22000, 180, 105, 20, 21, 15000,
   'No mojar por 24 horas. Evitar sauna, vapor y piscina por 48 horas. Dormir boca arriba las primeras noches.'),

  ('Diseño de cejas', 'brow_design',
   9000, NULL, 45, NULL, 10, 21, 3000,
   'No exponer al sol directo por 24 horas. No aplicar maquillaje en el área por 12 horas.'),

  ('Laminado de cejas', 'brow_lamination',
   18000, NULL, 60, NULL, 10, 42, 6000,
   'No mojar las cejas por 24 horas. No frotar. Aplicar el aceite nutritivo entregado por las noches durante una semana.'),

  ('Aplicación de henna', 'henna',
   12000, NULL, 50, NULL, 10, 14, 4000,
   'Evitar agua y jabón en el área por 24 horas para fijar el color. No exfoliar la zona por 3 días.'),

  ('Depilación con cera', 'waxing',
   7000, NULL, 30, NULL, 10, NULL, 2000,
   'No exponer al sol ni aplicar cremas perfumadas por 24 horas. Exfoliar suave a partir del tercer día.'),

  ('Lipstick / labios', 'lips',
   30000, 18000, 120, 60, 20, NULL, 12000,
   'Mantener los labios hidratados con el bálsamo entregado. No exfoliar ni frotar durante la cicatrización (5 a 7 días).');
