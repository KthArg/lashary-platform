DO $demo$
DECLARE
  v_admin   uuid;
  v_res     uuid := '00000000-0000-0000-0000-000000000a01';
  v_today   date := (now() AT TIME ZONE 'America/Costa_Rica')::date;
BEGIN
  IF EXISTS (SELECT 1 FROM public.scheduling_appointments) THEN
    RAISE NOTICE 'seed-demo: ya hay citas, no se hace nada';
    RETURN;
  END IF;

  SELECT u.id INTO v_admin
    FROM auth.users u
    JOIN public.auth_user_roles r ON r.user_id = u.id
   WHERE r.role IN ('superadmin', 'admin')
   ORDER BY (r.role = 'superadmin') DESC
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'seed-demo: crea primero una cuenta con rol admin o superadmin';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  UPDATE public.clients_profiles SET
    phone_verified = true,
    notes = CASE full_name
      WHEN 'María Fernández Rojas' THEN 'Clienta frecuente (demo).'
      WHEN 'Ana Lucía Vargas Mora' THEN 'Prefiere citas por la mañana (demo).'
      ELSE notes END;

  INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
  SELECT v_res, d, 540, 1080 FROM generate_series(1, 6) AS d
  ON CONFLICT DO NOTHING;

  CREATE TEMP TABLE demo_plan (
    key text, off int, hour int, client text, tech text, pkg text,
    status text, first_time boolean, dep_reg bigint
  ) ON COMMIT DROP;

  INSERT INTO demo_plan VALUES
    ('p1',  -21, 10, 'María Fernández Rojas', 'Set clásico',        NULL, 'completed',        true,  10000),
    ('p2',  -14, 13, 'Ana Lucía Vargas Mora', 'Set volumen',        NULL, 'completed',        true,  12000),
    ('p3',  -10, 10, 'Gabriela Solano Ureña', 'Laminado de cejas',  NULL, 'completed',        true,  6000),
    ('p4',   -7, 15, 'Karla Jiménez Castro',  'Diseño de cejas',    NULL, 'no_show',          true,  3000),
    ('p5',   -5, 10, 'María Fernández Rojas', 'Set clásico',        NULL, 'completed',        false, 10000),
    ('p6',   -3, 13, 'Daniela Chaves Brenes', 'Aplicación de henna',NULL, 'completed',        true,  4000),
    ('u1',   -1, 10, 'Gabriela Solano Ureña', 'Laminado de cejas',  NULL, 'approved',         false, 6000),
    ('t1',    0, 16, 'Daniela Chaves Brenes', 'Diseño de cejas',    NULL, 'confirmed',        false, 3000),
    ('f1',    1, 10, 'Karla Jiménez Castro',  'Set clásico',        NULL, 'pending_approval', true,  0),
    ('f2',    1, 13, 'Daniela Chaves Brenes', 'Depilación con cera',NULL, 'pending_approval', true,  0),
    ('f3',    2, 10, 'Ana Lucía Vargas Mora', 'Lipstick / labios',  NULL, 'approved',         true,  12000),
    ('f4',    2, 15, 'Gabriela Solano Ureña', 'Set volumen extra',  NULL, 'approved',         true,  15000),
    ('f5',    3, 10, 'María Fernández Rojas', 'Laminado de cejas',  NULL, 'confirmed',        false, 6000),
    ('f6',    4, 13, 'Karla Jiménez Castro',  'Aplicación de henna',NULL, 'confirmed',        true,  4000),
    ('f7',    5, 10, 'Daniela Chaves Brenes', 'Set volumen',        NULL, 'pending_approval', true,  0),
    ('f8',    6, 10, 'Gabriela Solano Ureña', 'Diseño de cejas',    NULL, 'cancelled',        true,  3000),
    ('f9',    8, 10, 'Ana Lucía Vargas Mora', 'Set clásico',        NULL, 'pending_approval', true,  10000),
    ('f10',   9, 13, 'Karla Jiménez Castro',  'Diseño de cejas',    NULL, 'rejected',         true,  0),
    ('f11',  10, 10, 'María Fernández Rojas', NULL, 'Cejas y pestañas clásico', 'approved',   NULL,  10000);

  CREATE TEMP TABLE demo_ids (key text PRIMARY KEY, id uuid, client_id uuid, starts_at timestamptz, ends_at timestamptz, svc text, price bigint, dep bigint, status text) ON COMMIT DROP;

  WITH base AS (
    SELECT p.*,
           CASE WHEN p.off = 0 THEN v_today
                  WHEN p.off > 0
                  THEN (SELECT g::date FROM generate_series(v_today + 1, v_today + 60, interval '1 day') g WHERE extract(isodow FROM g) <> 7 ORDER BY g OFFSET p.off - 1 LIMIT 1)
                  ELSE (SELECT g::date FROM generate_series(v_today - 60, v_today - 1, interval '1 day') g WHERE extract(isodow FROM g) <> 7 ORDER BY g DESC OFFSET -p.off - 1 LIMIT 1)
           END AS day,
           c.id AS client_id,
           t.id AS tech_id, t.name AS tech_name,
           pk.id AS pkg_id, pk.name AS pkg_name,
           CASE WHEN p.pkg IS NOT NULL THEN pk.price
                WHEN p.first_time THEN t.price_first_time
                ELSE coalesce(t.price_retouch, t.price_first_time) END AS price,
           CASE WHEN p.pkg IS NOT NULL THEN coalesce(pk.deposit, 0) ELSE t.deposit END AS dep,
           CASE WHEN p.pkg IS NOT NULL
                  THEN (SELECT sum(t2.duration_first_time_min)::int FROM public.catalog_package_techniques cpt JOIN public.catalog_techniques t2 ON t2.id = cpt.technique_id WHERE cpt.package_id = pk.id)
                WHEN p.first_time THEN t.duration_first_time_min
                ELSE coalesce(t.duration_retouch_min, t.duration_first_time_min) END AS dur,
           coalesce(t.buffer_min, 0) AS buf
      FROM demo_plan p
      JOIN public.clients_profiles c ON c.full_name = p.client
      LEFT JOIN public.catalog_techniques t ON t.name = p.tech
      LEFT JOIN public.catalog_packages pk ON pk.name = p.pkg
  ), timed AS (
    SELECT *, ((day + make_interval(hours => hour)) AT TIME ZONE 'America/Costa_Rica') AS s FROM base
  ), ins AS (
    INSERT INTO public.scheduling_appointments (
      resource_id, status, starts_at, ends_at, occupied_range, decided_by, decided_at, decision_reason,
      client_id, technique_id, technique_name, is_first_time, is_first_time_detected,
      service_price, deposit_required, deposit_registered, package_id, package_name,
      closed_by, closed_at, delivered_technique_id, delivered_technique_name, created_at
    )
    SELECT v_res, status, s, s + make_interval(mins => dur),
           tstzrange(s - make_interval(mins => buf), s + make_interval(mins => dur + buf), '[)'),
           CASE WHEN status IN ('approved','confirmed','completed','no_show','rejected','cancelled') THEN v_admin END,
           CASE WHEN status IN ('approved','confirmed','completed','no_show','rejected','cancelled') THEN least(s, now()) - interval '1 day' END,
           CASE WHEN status = 'rejected' THEN 'Ese horario ya no está disponible (demo).' END,
           client_id, tech_id, tech_name, first_time, first_time,
           price, dep, least(dep_reg, dep), pkg_id, pkg_name,
           CASE WHEN status IN ('completed','no_show') THEN v_admin END,
           CASE WHEN status IN ('completed','no_show') THEN s + make_interval(mins => dur + 15) END,
           CASE WHEN status = 'completed' THEN tech_id END,
           CASE WHEN status = 'completed' THEN tech_name END,
           least(s, now()) - interval '3 days'
      FROM timed
    RETURNING id, client_id, starts_at, ends_at, coalesce(technique_name, package_name) AS svc, service_price, deposit_required, status
  )
  INSERT INTO demo_ids (key, id, client_id, starts_at, ends_at, svc, price, dep, status)
  SELECT t.key, i.id, i.client_id, i.starts_at, i.ends_at, i.svc, i.service_price, i.deposit_required, i.status
    FROM ins i JOIN timed t ON t.client_id = i.client_id AND t.s = i.starts_at;

  INSERT INTO public.scheduling_appointment_package_techniques (appointment_id, technique_id, technique_name, duration_min, buffer_min)
  SELECT d.id, t.id, t.name, t.duration_first_time_min, coalesce(t.buffer_min, 0)
    FROM demo_ids d
    JOIN public.catalog_packages pk ON pk.name = 'Cejas y pestañas clásico'
    JOIN public.catalog_package_techniques cpt ON cpt.package_id = pk.id
    JOIN public.catalog_techniques t ON t.id = cpt.technique_id
   WHERE d.key = 'f11';

  UPDATE public.scheduling_appointments a SET
    reschedule_count = 1,
    previous_starts_at = a.starts_at - interval '1 day',
    previous_ends_at = a.ends_at - interval '1 day',
    previous_occupied_range = tstzrange(lower(a.occupied_range) - interval '1 day', upper(a.occupied_range) - interval '1 day', '[)'),
    previous_status = 'approved'
   FROM demo_ids d WHERE d.key = 'f9' AND a.id = d.id;

  INSERT INTO public.scheduling_closed_dates (resource_id, closed_on, kind, label) VALUES
    (v_res, v_today + 40, 'holiday', 'Feriado de ejemplo'),
    (v_res, v_today + 41, 'non_working', 'Vacaciones de ejemplo');

  INSERT INTO public.scheduling_manual_blocks (resource_id, starts_at, ends_at, reason) VALUES
    (v_res, ((v_today + 30 + time '13:00') AT TIME ZONE 'America/Costa_Rica'),
            ((v_today + 30 + time '15:00') AT TIME ZONE 'America/Costa_Rica'), 'Capacitación (demo)');

  INSERT INTO public.scheduling_alerts (kind, resource_id, client_id, requested_from, requested_until)
  SELECT 'appointment_overlap_rejected', v_res, d.client_id, d.starts_at, d.ends_at FROM demo_ids d WHERE d.key = 'f3';

  INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount, created_at)
  SELECT d.client_id, d.id, 'charge', d.price, d.ends_at FROM demo_ids d WHERE d.status = 'completed';
  INSERT INTO public.payments_ledger_entries (client_id, appointment_id, kind, amount, created_at)
  SELECT d.client_id, d.id, 'deposit_credit', -a.deposit_registered, d.ends_at
    FROM demo_ids d JOIN public.scheduling_appointments a ON a.id = d.id
   WHERE d.status = 'completed' AND a.deposit_registered > 0;

  INSERT INTO public.payments_deposit_exemptions (client_id, exempted_by, reason, active)
  SELECT id, v_admin, 'Clienta frecuente (demo).', true FROM public.clients_profiles WHERE full_name = 'María Fernández Rojas';

  INSERT INTO public.notifications_admin_inbox (kind, appointment_id, client_name, service_name, starts_at, read_at)
  SELECT 'booking_created', d.id, c.full_name, d.svc, d.starts_at, now() - interval '1 day'
    FROM demo_ids d JOIN public.clients_profiles c ON c.id = d.client_id
   WHERE d.key IN ('f3', 'f4', 'f5', 'f6', 'f8', 'f10', 'f11', 'p6', 't1', 'u1')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.notifications_admin_inbox (kind, appointment_id, client_name, service_name, starts_at, event_id, forfeited_deposit)
  SELECT 'appointment_cancelled', d.id, c.full_name, d.svc, d.starts_at, gen_random_uuid(), 3000
    FROM demo_ids d JOIN public.clients_profiles c ON c.id = d.client_id WHERE d.key = 'f8';
  INSERT INTO public.notifications_admin_inbox (kind, appointment_id, client_name, service_name, starts_at, event_id, previous_starts_at)
  SELECT 'appointment_rescheduled', d.id, c.full_name, d.svc, d.starts_at, gen_random_uuid(), d.starts_at - interval '1 day'
    FROM demo_ids d JOIN public.clients_profiles c ON c.id = d.client_id WHERE d.key = 'f9';

  INSERT INTO public.notifications_confirmation_requests (appointment_id, client_id, starts_at, service_name, status, attempts, last_channel, sent_at)
  SELECT d.id, d.client_id, d.starts_at, d.svc,
         CASE WHEN d.key = 'f3' THEN 'sent' ELSE 'pending' END,
         CASE WHEN d.key = 'f3' THEN 1 ELSE 0 END,
         CASE WHEN d.key = 'f3' THEN 'email' END,
         CASE WHEN d.key = 'f3' THEN now() - interval '2 hours' END
    FROM demo_ids d WHERE d.key IN ('f3', 'f4');

  INSERT INTO public.notifications_reminders (appointment_id, client_id, starts_at, technique_name, send_at, status, attempts, last_channel, sent_at, last_error)
  SELECT d.id, d.client_id, d.starts_at, d.svc, d.starts_at - interval '24 hours',
         v.status, v.attempts, v.channel, v.sent_at, v.err
    FROM demo_ids d
    JOIN (VALUES
      ('p6',  'sent',    1, 'whatsapp', now() - interval '4 days', NULL),
      ('p3',  'sent',    2, 'email',    now() - interval '11 days', NULL),
      ('f3',  'pending', 0, NULL,       NULL::timestamptz, NULL),
      ('f5',  'pending', 0, NULL,       NULL::timestamptz, NULL),
      ('f6',  'failed',  1, NULL,       NULL::timestamptz, 'La clienta no tiene contacto'),
      ('f4',  'claimed', 1, NULL,       NULL::timestamptz, NULL),
      ('t1',  'sent',    1, 'whatsapp', now() - interval '3 hours', NULL)
    ) AS v(key, status, attempts, channel, sent_at, err) ON v.key = d.key;

  UPDATE public.notifications_reminders SET claimed_at = now() WHERE status = 'claimed';

  INSERT INTO public.notifications_reminder_attempts (reminder_id, attempt_number, channel, outcome, error, attempted_at)
  SELECT r.id, v.n, v.channel, v.outcome, v.err, now() - interval '5 days'
    FROM public.notifications_reminders r
    JOIN demo_ids d ON d.id = r.appointment_id
    JOIN (VALUES
      ('p6', 1, 'whatsapp', 'sent',      NULL),
      ('p3', 1, 'whatsapp', 'failed',    'Plantilla de WhatsApp no aprobada'),
      ('p3', 2, 'email',    'sent',      NULL),
      ('f6', 1, NULL,       'no_contact','La clienta no tiene contacto'),
      ('f4', 1, 'whatsapp', 'not_configured', 'Canal de WhatsApp sin configurar'),
      ('t1', 1, 'whatsapp', 'sent',      NULL)
    ) AS v(key, n, channel, outcome, err) ON v.key = d.key;

  INSERT INTO public.notifications_client_notices (kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at, status, attempts, last_channel, sent_at)
  SELECT 'reschedule_rejected', gen_random_uuid(), d.id, d.client_id, d.svc, d.starts_at + interval '1 day', d.starts_at, 'sent', 1, 'email', now() - interval '1 day'
    FROM demo_ids d WHERE d.key = 'f10';
  INSERT INTO public.notifications_client_notices (kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at, status)
  SELECT 'reschedule_expired', gen_random_uuid(), d.id, d.client_id, d.svc, d.starts_at, d.starts_at - interval '1 day', 'pending'
    FROM demo_ids d WHERE d.key = 'f9';

  INSERT INTO public.notifications_dropped_notices (event_id, action, appointment_id, error)
  SELECT gen_random_uuid(), 'scheduling.appointment.cancelled', d.id, 'No se pudo registrar el aviso (demo).'
    FROM demo_ids d WHERE d.key = 'f8';

  INSERT INTO public.clients_record_versions (id, client_id, previous_version_id, change_kind, study_text, recommended_technique_id, recommended_technique_name, precautions, images, created_by, created_at)
  SELECT '11111111-0000-0000-0000-000000000001', c.id, NULL, 'initial',
         'Pestañas naturales cortas; se recomienda un set clásico.', t.id, t.name, '[]'::jsonb, '[]'::jsonb, v_admin, now() - interval '21 days'
    FROM public.clients_profiles c, public.catalog_techniques t
   WHERE c.full_name = 'María Fernández Rojas' AND t.name = 'Set clásico';
  INSERT INTO public.clients_record_versions (id, client_id, previous_version_id, change_kind, study_text, recommended_technique_id, recommended_technique_name, precautions, images, created_by, created_at)
  SELECT '11111111-0000-0000-0000-000000000002', c.id, '11111111-0000-0000-0000-000000000001', 'precaution_added',
         'Pestañas naturales cortas; se recomienda un set clásico.', t.id, t.name,
         jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'categoryId', k.id::text, 'categoryName', k.name, 'description', 'Sensibilidad al pegamento (demo).')),
         '[]'::jsonb, v_admin, now() - interval '5 days'
    FROM public.clients_profiles c, public.catalog_techniques t, public.clients_precaution_categories k
   WHERE c.full_name = 'María Fernández Rojas' AND t.name = 'Set clásico' AND k.name = 'Sensibilidad';
  INSERT INTO public.clients_record_versions (client_id, change_kind, study_text, created_by, created_at)
  SELECT c.id, 'initial', 'Primera visita; ojos sensibles, sin recomendación aún.', v_admin, now() - interval '14 days'
    FROM public.clients_profiles c WHERE c.full_name = 'Ana Lucía Vargas Mora';

  INSERT INTO public.catalog_promotions (package_id, discount_percent, starts_at, ends_at, is_active)
  SELECT id, 15, now() - interval '1 day', now() + interval '30 days', true
    FROM public.catalog_packages WHERE name = 'Cejas y pestañas clásico'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.catalog_packages (name, price, deposit, is_active)
  VALUES ('Set volumen y cejas', 45000, 15000, true), ('Paquete de temporada (inactivo)', 40000, 12000, false);
  INSERT INTO public.catalog_package_techniques (package_id, technique_id)
  SELECT p.id, t.id FROM public.catalog_packages p JOIN public.catalog_techniques t ON t.name IN ('Set volumen', 'Diseño de cejas') WHERE p.name = 'Set volumen y cejas';
  INSERT INTO public.catalog_package_techniques (package_id, technique_id)
  SELECT p.id, t.id FROM public.catalog_packages p JOIN public.catalog_techniques t ON t.name IN ('Laminado de cejas', 'Depilación con cera') WHERE p.name = 'Paquete de temporada (inactivo)';

  INSERT INTO public.catalog_promotions (technique_id, discount_percent, starts_at, ends_at, is_active)
  SELECT id, 10, now() - interval '60 days', now() - interval '30 days', true FROM public.catalog_techniques WHERE name = 'Diseño de cejas';

  UPDATE public.store_products SET existencias = 15 WHERE slug = 'serum-nutritivo-lashary';
  INSERT INTO public.store_products (slug, nombre, descripcion, url_imagen, precio_crc, activo, sort_order, existencias) VALUES
    ('pegamento-hipoalergenico-demo', 'Pegamento hipoalergénico', 'Pegamento para sensibilidad (demo).', '/productos/serum-nutritivo.jpg', 9500, true, 3, 8),
    ('kit-cuidado-demo', 'Kit de cuidado', 'Serum y cepillo en un solo kit (demo).', '/productos/cepillo-limpiador.jpg', 27000, true, 4, 3),
    ('producto-descontinuado-demo', 'Producto descontinuado', 'Producto inactivo para probar el panel (demo).', '/productos/serum-nutritivo.jpg', 7000, false, 5, 0);

  INSERT INTO public.store_cart_items (user_id, product_id, cantidad)
  SELECT v_admin, id, 1 FROM public.store_products ORDER BY slug LIMIT 2
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload, created_at)
  SELECT v_admin,
         CASE d.status WHEN 'rejected' THEN 'scheduling.appointment.rejected'
                       WHEN 'completed' THEN 'scheduling.appointment.closed'
                       ELSE 'scheduling.appointment.approved' END,
         'scheduling_appointment', d.id, jsonb_build_object('status', d.status, 'demo', true), d.starts_at - interval '2 days'
    FROM demo_ids d WHERE d.status IN ('approved', 'confirmed', 'rejected', 'completed');
  INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, payload)
  SELECT v_admin, 'payments.exemption.granted', 'payments_deposit_exemption', id, jsonb_build_object('demo', true)
    FROM public.payments_deposit_exemptions;

  RAISE NOTICE 'seed-demo: citas=%', (SELECT count(*) FROM demo_ids);
END
$demo$;
