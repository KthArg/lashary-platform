# ADR-0009 — Archivado de clientas y conservación de exoneraciones

> **Estado:** propuesto. **Fecha:** 2026-10-03. **Decisores:** propuesta respaldada por Bayron en esta conversación; pendiente de revisión del equipo.

## Contexto

US-AGE-13 permite exonerar el anticipo a una clienta y registra la decisión en `payments_deposit_exemptions` y `audit_events`. La migración `20260924000000_payments_deposit_exemptions.sql` vincula `client_id` a `clients_profiles.id` con `ON DELETE CASCADE`: borrar físicamente el perfil elimina sus exoneraciones. Los eventos de auditoría permanecen porque `entity_id` no tiene FK al perfil.

El feedback de #118 señala el acoplamiento entre `payments` y `clients` y el borrado en cascada. ARCH-005 prohíbe queries directas a tablas de otra feature; no menciona explícitamente FK, pero su riesgo de acoplamiento al esquema también requiere una decisión registrada. INT-003 exige explicitar el contrato compartido antes de su implementación.

En esta rama no existe un flujo de borrado o archivado de clientas ni uno para retirar exoneraciones. Las exoneraciones no tienen vencimiento automático. Una cola que espere a que desaparezcan no tiene una condición de finalización garantizada; dejar de estar activa tampoco equivale a borrar su historial.

## Decisión propuesta

Archivar a la clienta para retirarla de las operaciones habituales sin borrar su perfil ni sus exoneraciones, citas, pagos o eventos de auditoría. El archivado no elimina ni revoca automáticamente una exoneración y no procesa un borrado posterior mediante una cola.

Conservar la FK específica `payments_deposit_exemptions.client_id → clients_profiles.id` como contrato de integridad entre `payments` y `clients`: evita exoneraciones huérfanas. Esta decisión no declara todas las tablas de `clients` como compartidas ni permite consultas directas a ellas desde `payments`. Cambios de esa clave requieren coordinación entre ambas features.

Sustituir `ON DELETE CASCADE` por `ON DELETE RESTRICT` en una migración nueva, forward-only (INT-008), para bloquear el borrado físico de perfiles con cualquier exoneración, activa o histórica. RLS sigue siendo la frontera de acceso (SEC-001).

El borrado definitivo y la anonimización requieren una política posterior sobre conservación de datos y referencias. Este ADR no fija un plazo de retención ni establece conservación indefinida como política.

## Alternativas consideradas

- Mantener el borrado en cascada: pierde las filas de exoneración al borrar el perfil, aunque permanezca la bitácora.
- Encolar el borrado hasta que no haya exoneración: hoy no hay vencimiento ni retiro, por lo que podría no terminar; tampoco define qué conservar de citas y pagos.
- Quitar la FK y validar solo en la aplicación: reduce el acoplamiento al esquema, pero pierde la garantía de integridad de la base y necesita un contrato público y manejo de concurrencia adicionales.
- Implementar ahora un borrado definitivo completo: requiere acordar conservación o anonimización de todas las referencias, fuera del alcance de esta decisión.

## Consecuencias

- `clients` deberá implementar el archivado. Antes de escribir código se deben acordar permisos, comportamiento de búsquedas y reservas, tratamiento de citas existentes y posibilidad de restauración.
- `payments` deberá publicar una migración y una prueba de base real: borrar un perfil con exoneración activa o inactiva falla y conserva ambas filas; el esquema deja de tener borrado en cascada.
- El archivado requiere sus propias pruebas de acceso y comportamiento; no se considera implementado por existir este documento.
- Este PR solo documenta el contrato y la propuesta. La FK actual todavía tiene `CASCADE`; el riesgo de #118 sigue pendiente hasta aprobar la decisión y aplicar y verificar la migración. No se edita la migración ya aprobada.
- La aprobación del PO para trasladar los criterios originales 2, 3 y 4 de US-AGE-13 es una decisión distinta y permanece vigente.
