# US-AGE-13: aprobación del traslado de criterios

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Registrar la aprobación del PO para trasladar los criterios 2 y 3 a US-AGE-05 y el 4 a US-AGE-12, y aplicar el feedback STYLES de #152.

**Architecture:** Actualizar dependencias, backlog y SPEC de payments/scheduling; regenerar STATUS.md. El código solo cambia el alias local de estilos.

**Tech Stack:** Markdown, CSV, TypeScript/React, Bash y Vitest.

**Spec:** docs/process/DEPENDENCIES.md y aprobación del PO comunicada por Bayron en esta conversación el 2026-10-03.

## Global Constraints

- EST-002/003/006: generar STATUS.md, actualizar el SPEC afectado y registrar hechos.
- INT-005: incremento contra la rama de #154; merge commit por un revisor externo.
- US-AGE-13 sigue en_progreso hasta demostrar el anticipo por paquete.
- La aprobación cubre US-AGE-13; no decide el FK cross-feature ni el traslado de US-AGE-08.

## Review Focus

- Conservar los tres requisitos completos, incluida la advertencia de pérdida por cancelación tardía o inasistencia.
- Evitar duplicar los requisitos como criterios activos en US-AGE-13.
- Mantener los estados de US-AGE-05/12 sin afirmar implementación o pruebas inexistentes.
- Preservar los IDs originales 1 y 5 al documentar el alcance restante.
- Cambiar Styles a STYLES tanto en la página como en ExemptClientForm.

## Ejecución

- [x] Registrar aprobación y trazabilidad en DEPENDENCIES.md, backlog CSV y SPEC de payments/scheduling.
- [x] Renombrar los alias Styles a STYLES y regenerar STATUS.md.
- [x] Verificar el CSV y el traslado, correr verify.sh y los tests existentes de UI.
- [x] Revisar el diff y preparar un PR contra us/US-AGE-13-13-beforeall-probe con los resultados reales.
