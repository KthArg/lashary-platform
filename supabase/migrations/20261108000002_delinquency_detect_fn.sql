-- 20261108000002_delinquency_detect_fn.sql
-- US-MOR-01 · feature delinquency — detección de pagos sin registrar (criterios 1 y 2). Lee de
-- `payments` las citas cerradas con saldo pendiente pasado el periodo de gracia y deja una morosidad
-- `pending_review` por cada una; no la activa: la administradora la revisa (criterio 3, DOM-012).
-- Devuelve cuántas morosidades nuevas generó. No hay bandera de encendido (decisión del PO, 2026-11-08):
-- lee el ledger y funciona sola cuando US-MOR-03 registre pagos; el cron no está programado hasta entonces. Es idempotente: una cita que ya tiene morosidad, incluso descartada, no
-- se vuelve a generar (UNIQUE appointment_id).
-- SECURITY DEFINER porque escribe delinquency_cases, que staff no puede escribir directo; solo staff la
-- llama. Lee el ledger por el contrato de payments (payments_unpaid_charges), no la tabla (ARCH-005).
-- Recorre la lista por cursor, de a 200, con un máximo de 50 páginas por corrida: así las morosidades
-- ya existentes, que siguen impagas, no tapan a las citas nuevas (PERF-002).
-- Cumplimiento: ARCH-005, DOM-005, DOM-012, SEC-001, SEC-002, PERF-002, INT-003, INT-008.

CREATE FUNCTION public.delinquency_detect_unpaid()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_page_size CONSTANT integer := 200;
  c_max_pages CONSTANT integer := 50;

  v_settings  public.delinquency_settings;
  v_cutoff    timestamptz;
  v_after_at  timestamptz;
  v_after_id  uuid;
  v_seen      integer;
  v_page      integer := 0;
  v_inserted  integer := 0;
  v_rows      integer;
  r           record;
BEGIN
  IF NOT public.auth_is_staff() THEN
    RAISE EXCEPTION 'delinquency_not_staff' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_settings FROM public.delinquency_settings;

  v_cutoff := now() - make_interval(days => v_settings.grace_days);

  LOOP
    v_seen := 0;
    FOR r IN
      SELECT u.client_id, u.appointment_id, u.pending, u.closed_at
        FROM public.payments_unpaid_charges(v_cutoff, c_page_size, v_after_at, v_after_id) u
    LOOP
      v_seen := v_seen + 1;
      v_after_at := r.closed_at;
      v_after_id := r.appointment_id;

      INSERT INTO public.delinquency_cases (client_id, appointment_id, pending)
      VALUES (r.client_id, r.appointment_id, r.pending)
      ON CONFLICT (appointment_id) DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_inserted := v_inserted + v_rows;
    END LOOP;

    v_page := v_page + 1;
    EXIT WHEN v_seen < c_page_size OR v_page >= c_max_pages;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.delinquency_detect_unpaid() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delinquency_detect_unpaid() FROM anon;
GRANT EXECUTE ON FUNCTION public.delinquency_detect_unpaid() TO authenticated;
