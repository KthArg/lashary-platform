-- 20261101000000_catalog_deactivate_technique_cascade_fn.sql
-- Renombrada desde 20261031000000 (sin mergear a main): esa fecha choca con
-- 20261031000000_payments_ledger_entries.sql de US-AGE-12. Mismo contenido, solo la fecha.
-- feature catalog — hallazgo del code review de US-AGE-04 (decisión del PO, comunicada por el
-- líder del proyecto): hoy desactivar una técnica no revisa si algún paquete activo la incluye, y
-- ese paquete se sigue vendiendo con una técnica que ya no existe para reservas sueltas. La
-- decisión es avisar (nombrando el paquete) y, si la usuaria confirma, desactivar los dos juntos;
-- si no confirma, no tocar nada.
-- catalog_save_package ya exige que activar un paquete tenga todas sus técnicas activas
-- (resolveTechniques en application/packages/commands.ts); esta función cierra el otro sentido —
-- desactivar una técnica — sin duplicar esa validación.
--
-- p_expected_package_ids es el mismo patrón de "valor esperado" que scheduling_cancel_appointment
-- (p_expected_forfeited_deposit, 20261022000001): la capa TS primero lee qué paquetes activos
-- incluyen la técnica (una lectura pública, catalog_package_techniques_select_all +
-- catalog_packages_select_all, sin necesitar esta función) y muestra el aviso con sus nombres; al
-- confirmar, se reenvía esa misma lista. Si cambió entre el aviso y la confirmación — alguien
-- activó o desactivó un paquete mientras tanto — la función rechaza con
-- catalog_affected_packages_changed en vez de aplicar un aviso que ya no es cierto, y la capa TS
-- vuelve a mostrar el aviso con la lista fresca.
--
-- SECURITY INVOKER, igual que catalog_save_package y catalog_delete_package: la autorización real
-- son las políticas de "solo staff" que ya existen en catalog_techniques y catalog_packages
-- (20260902000001, 20260922000001), no esta función.
-- Cumplimiento: ARCH-006 (prefijo catalog_), DOM-010 (lock antes de decidir, misma transacción),
-- SEC-001 (RLS es la frontera real), INT-008 (una migración, forward-only).

CREATE FUNCTION public.catalog_deactivate_technique_cascade(
  p_technique_id          uuid,
  p_expected_package_ids  uuid[]
)
RETURNS TABLE (deactivated_package_ids uuid[])
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_actual_package_ids  uuid[];
  v_expected_sorted     uuid[];
BEGIN
  -- Bloquea los paquetes afectados antes de comparar, para que un cambio concurrente no se cuele
  -- entre el SELECT y el UPDATE (DOM-010, mismo criterio que scheduling_book_appointment).
  -- FOR UPDATE no admite funciones de agregación en el mismo SELECT, así que el lock y la lectura
  -- van en dos pasos: el lock persiste para el segundo dentro de la misma transacción.
  PERFORM 1
    FROM public.catalog_packages p
    JOIN public.catalog_package_techniques pt ON pt.package_id = p.id
   WHERE pt.technique_id = p_technique_id
     AND p.is_active
     FOR UPDATE OF p;

  SELECT coalesce(array_agg(p.id ORDER BY p.id), ARRAY[]::uuid[])
    INTO v_actual_package_ids
    FROM public.catalog_packages p
    JOIN public.catalog_package_techniques pt ON pt.package_id = p.id
   WHERE pt.technique_id = p_technique_id
     AND p.is_active;

  SELECT coalesce(array_agg(DISTINCT id ORDER BY id), ARRAY[]::uuid[])
    INTO v_expected_sorted
    FROM unnest(p_expected_package_ids) AS id;

  IF v_actual_package_ids IS DISTINCT FROM v_expected_sorted THEN
    RAISE EXCEPTION 'catalog_affected_packages_changed'
      USING ERRCODE = '40001',
            DETAIL = 'la lista de paquetes afectados cambió desde que se mostró el aviso';
  END IF;

  UPDATE public.catalog_techniques SET is_active = false WHERE id = p_technique_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalog_deactivate_technique_cascade: sin permiso para desactivar la técnica %', p_technique_id
      USING ERRCODE = '42501';
  END IF;

  IF cardinality(v_actual_package_ids) > 0 THEN
    UPDATE public.catalog_packages SET is_active = false WHERE id = ANY(v_actual_package_ids);
  END IF;

  RETURN QUERY SELECT v_actual_package_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_deactivate_technique_cascade(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_deactivate_technique_cascade(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_deactivate_technique_cascade(uuid, uuid[]) TO authenticated;
