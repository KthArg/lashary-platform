# Anticipo por paquete — US-AGE-13

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** permitir que staff configure un anticipo independiente por paquete y demostrar el criterio original 1 de US-AGE-13.

**Arquitectura:** ampliar el contrato de catalog, persistir deposit en catalog_packages y extender dominio, repositorio y formulario. No se calculan sumas de anticipos de técnicas ni se implementan reservas o cierre.

**Tecnologías:** TypeScript, React, Zod, PostgreSQL/pgTAP y Vitest.

**Especificación:** docs/contracts/catalog-api.md, criterio original 1 de US-AGE-13 y diseño aprobado en esta conversación.

## Restricciones

- INT-002/008: menos de 400 líneas por pieza y una migración como máximo.
- INT-003: contrato abierto antes de implementar; integrar el contrato antes del código.
- INT-005/009: merge commit entre piezas; Conventional Commits en español y posición i/N.
- DOM-001/007/009, SEC-001/002: enteros no negativos, mensajes externalizados y RLS real.
- No editar migraciones existentes ni usar credenciales service-role.
- Base técnica: fix/catalog-save-package-invariants (#175), que contiene #173 y #174. Integrar esas dependencias antes de este trabajo.

## Revisión

Anticipo 0; rechazo de negativos y decimales; edición sin perder el anticipo al desactivar; persistencia real; protección contra escrituras anónimas/clienta; compatibilidad del RPC previo.

## Piezas

- [ ] 16/20: contrato deposit, especificaciones y plan.
- [ ] 17/20: columna y RPC nuevo con pruebas pgTAP; comprobar fallo antes de la migración y éxito después.
- [ ] 18/20: dominio, comandos y repositorio; pruebas de creación, edición, desactivación y lectura.
- [ ] 19/20: formulario, validación y actions; pruebas de ingreso, edición y envío.
- [ ] 20/20: evidencia y faltantes en la pila original de payments, sin declarar integración o aprobación inexistentes.

Ejecutar verify.sh y pruebas pertinentes antes de cada commit/PR. Actualizar títulos de las 15 piezas existentes a N=20, respetando sus posiciones.
