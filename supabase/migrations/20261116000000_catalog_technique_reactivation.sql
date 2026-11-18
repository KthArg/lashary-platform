-- 20261116000000_catalog_technique_reactivation.sql
-- feature catalog — US-AGE-08: reactivar una técnica. Decisión del PO (2026-11-17): al reactivar
-- una técnica vuelven a activarse los paquetes que la cascada de desactivación desactivó, pero solo
-- los que quedan con todas sus técnicas activas (la misma regla que catalog_save_package).
--
-- Para no reactivar paquetes que la administradora desactivó a mano, la cascada registra qué
-- paquetes apagó (catalog_cascade_deactivations). Un cambio manual de is_active en un paquete borra
-- sus marcas (trigger), así que un paquete apagado a mano nunca vuelve por la cascada.
--
-- Cumplimiento: ARCH-006 (prefijo catalog_), DOM-010 (lock antes de decidir, misma transacción),
-- SEC-001 (RLS es la frontera real), PERF-003 (FK indexada), INT-008 (forward-only: la función de
-- desactivación se reemplaza con CREATE OR REPLACE y el resto es nuevo).

CREATE TABLE public.catalog_cascade_deactivations (
  technique_id uuid NOT NULL REFERENCES public.catalog_techniques (id),
  package_id   uuid NOT NULL REFERENCES public.catalog_packages (id),
  PRIMARY KEY (technique_id, package_id)
);

CREATE INDEX idx_catalog_cascade_deactivations_technique ON public.catalog_cascade_deactivations (technique_id);

CREATE INDEX idx_catalog_cascade_deactivations_package ON public.catalog_cascade_deactivations (package_id);

ALTER TABLE public.catalog_cascade_deactivations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_cascade_deactivations_staff"
  ON public.catalog_cascade_deactivations
  FOR ALL
  TO authenticated
  USING (public.auth_is_staff())
  WITH CHECK (public.auth_is_staff());

-- Un cambio manual (o de otra función) del estado de un paquete invalida sus marcas de cascada.
-- La cascada escribe sus marcas DESPUÉS de su UPDATE, así que este trigger no las borra.
CREATE FUNCTION public.catalog_clear_cascade_marks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.catalog_cascade_deactivations WHERE package_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER catalog_packages_clear_cascade_marks
  AFTER UPDATE OF is_active ON public.catalog_packages
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION public.catalog_clear_cascade_marks();

-- Paquetes que se reactivarían al reactivar p_technique_id. Se usa tanto para mostrar el aviso como
-- dentro de la reactivación, así que ambas miran exactamente lo mismo. La técnica se ignora en su
-- propio chequeo: al reactivarla todavía puede figurar inactiva.
CREATE FUNCTION public.catalog_reactivation_package_ids(p_technique_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(p.id ORDER BY p.id), ARRAY[]::uuid[])
    FROM public.catalog_packages p
   WHERE NOT p.is_active
     AND EXISTS (
       SELECT 1 FROM public.catalog_package_techniques pt
        WHERE pt.package_id = p.id AND pt.technique_id = p_technique_id
     )
     AND EXISTS (
       SELECT 1 FROM public.catalog_cascade_deactivations cd
        WHERE cd.package_id = p.id
     )
     AND NOT EXISTS (
       SELECT 1
         FROM public.catalog_package_techniques pt
         JOIN public.catalog_techniques t ON t.id = pt.technique_id
        WHERE pt.package_id = p.id
          AND NOT t.is_active
          AND t.id <> p_technique_id
     );
$$;

CREATE FUNCTION public.catalog_reactivation_preview(p_technique_id uuid)
RETURNS TABLE (package_id uuid, package_name text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT p.id, p.name
    FROM public.catalog_packages p
   WHERE p.id = ANY(public.catalog_reactivation_package_ids(p_technique_id))
   ORDER BY p.name, p.id;
$$;

CREATE FUNCTION public.catalog_reactivate_technique(
  p_technique_id          uuid,
  p_expected_package_ids  uuid[]
)
RETURNS TABLE (reactivated_package_ids uuid[])
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_actual_package_ids  uuid[];
  v_expected_sorted     uuid[];
BEGIN
  -- Bloquea los paquetes candidatos antes de decidir (DOM-010), igual que la cascada.
  PERFORM 1
    FROM public.catalog_packages p
    JOIN public.catalog_package_techniques pt ON pt.package_id = p.id
   WHERE pt.technique_id = p_technique_id
     AND NOT p.is_active
     FOR UPDATE OF p;

  v_actual_package_ids := public.catalog_reactivation_package_ids(p_technique_id);

  SELECT coalesce(array_agg(DISTINCT id ORDER BY id), ARRAY[]::uuid[])
    INTO v_expected_sorted
    FROM unnest(p_expected_package_ids) AS id;

  IF v_actual_package_ids IS DISTINCT FROM v_expected_sorted THEN
    RAISE EXCEPTION 'catalog_affected_packages_changed'
      USING ERRCODE = '40001',
            DETAIL = 'la lista de paquetes a reactivar cambió desde que se mostró el aviso';
  END IF;

  UPDATE public.catalog_techniques SET is_active = true WHERE id = p_technique_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalog_reactivate_technique: sin permiso para reactivar la técnica %', p_technique_id
      USING ERRCODE = '42501';
  END IF;

  IF cardinality(v_actual_package_ids) > 0 THEN
    UPDATE public.catalog_packages SET is_active = true WHERE id = ANY(v_actual_package_ids);
    DELETE FROM public.catalog_cascade_deactivations WHERE package_id = ANY(v_actual_package_ids);
  END IF;

  RETURN QUERY SELECT v_actual_package_ids;
END;
$$;

-- Cascada de desactivación: misma firma y comportamiento que la migración 20261101000000, más el
-- registro de qué paquetes apagó (para que la reactivación sepa cuáles devolver).
CREATE OR REPLACE FUNCTION public.catalog_deactivate_technique_cascade(
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
    INSERT INTO public.catalog_cascade_deactivations (technique_id, package_id)
    SELECT p_technique_id, package_id FROM unnest(v_actual_package_ids) AS package_id;
  END IF;

  RETURN QUERY SELECT v_actual_package_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_clear_cascade_marks() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_reactivation_package_ids(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_reactivation_package_ids(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.catalog_reactivation_preview(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_reactivation_preview(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.catalog_reactivate_technique(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_reactivate_technique(uuid, uuid[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.catalog_reactivation_package_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_reactivation_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_reactivate_technique(uuid, uuid[]) TO authenticated;
