DO $demo$
DECLARE
  v_admin uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.clients_appointment_notes) THEN
    RAISE NOTICE 'seed-demo-anotaciones: ya hay anotaciones, no se hace nada';
    RETURN;
  END IF;

  SELECT u.id INTO v_admin
    FROM auth.users u
    JOIN public.auth_user_roles r ON r.user_id = u.id
   WHERE r.role IN ('superadmin', 'admin')
   ORDER BY (r.role = 'superadmin') DESC
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'seed-demo-anotaciones: crea primero una cuenta con rol admin o superadmin';
  END IF;

  INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by, created_at, updated_at)
  SELECT a.client_id, a.id, n.body, v_admin, a.ends_at + interval '30 minutes', a.ends_at + interval '30 minutes'
    FROM public.scheduling_appointments a
    JOIN public.clients_profiles c ON c.id = a.client_id
    JOIN (VALUES
      ('María Fernández Rojas', 'Set clásico',        'Primera visita: pestañas naturales, buen agarre del pegamento (demo).'),
      ('María Fernández Rojas', 'Laminado de cejas',  'Retoque a las dos semanas, sin molestias (demo).'),
      ('Ana Lucía Vargas Mora', 'Set volumen',        'Ojos sensibles: usar cinta suave y revisar enrojecimiento (demo).'),
      ('Gabriela Solano Ureña', 'Laminado de cejas',  'Prefiere un acabado natural; repetir en seis semanas (demo).'),
      ('Daniela Chaves Brenes', 'Aplicación de henna','Piel clara, dejar actuar menos tiempo la próxima vez (demo).')
    ) AS n(client_name, service, body) ON n.client_name = c.full_name AND n.service = a.technique_name
   WHERE a.status = 'completed';

  INSERT INTO public.clients_appointment_notes (client_id, appointment_id, body, created_by, created_at, updated_at)
  SELECT a.client_id, a.id, 'Anotación editada después de la visita (demo).', v_admin, a.ends_at + interval '1 hour', a.ends_at + interval '1 day'
    FROM public.scheduling_appointments a
    JOIN public.clients_profiles c ON c.id = a.client_id
   WHERE a.status = 'completed' AND c.full_name = 'María Fernández Rojas' AND a.technique_name = 'Set clásico'
   LIMIT 1;

  RAISE NOTICE 'seed-demo-anotaciones: anotaciones=%', (SELECT count(*) FROM public.clients_appointment_notes);
END
$demo$;
