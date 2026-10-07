# Anticipo por paquete — US-AGE-13

> **Para agentes:** usar superpowers:executing-plans para ejecutar y verificar cada pieza; registrar los pasos con casillas.

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
- Base técnica: main ya incluye #173, #174 y #175 (squash integrado el 2026-10-05). Las piezas 16 a 20 continúan después de #177, en una única pila de US-AGE-13.

## Revisión

Anticipo 0; rechazo de negativos y decimales; edición sin perder el anticipo al desactivar; persistencia real; protección contra escrituras anónimas/clienta; compatibilidad del RPC previo.

## Piezas

- [x] 16/20: contrato deposit, especificaciones y plan.
- [x] 17/20: columna y RPC nuevo con pruebas pgTAP; comprobar fallo antes de la migración y éxito después.
- [x] 18/20: dominio, comandos y repositorio; pruebas de creación, edición, desactivación y lectura.
- [ ] 19/20: formulario, validación y actions; pruebas de ingreso, edición y envío.
- [x] 20/20: evidencia y faltantes en la pila original de payments, sin declarar integración o aprobación inexistentes.

Ejecutar verify.sh y pruebas pertinentes antes de cada commit/PR. Actualizar títulos de las 15 piezas existentes a N=20, respetando sus posiciones.

La evidencia de la pieza 20/20 está publicada en #182, sobre la pila original de payments.
