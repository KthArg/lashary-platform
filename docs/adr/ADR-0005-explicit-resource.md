# ADR-0005 — Agenda con recurso explícito

> **Estado:** aceptado. **Fecha:** 2026-08-27. **Decisores:** PO + bootstrap. **Reglas:** DOM-010. **Relacionado:** ADR-0002.

## Contexto

El backlog está escrito para una única dueña-operadora; ninguna historia menciona una segunda técnica. Preguntado explícitamente (bootstrap 2026-08-27, pregunta 3), el PO respondió **"posiblemente"** habrá más de una técnica en el futuro. Retrofit de multi-recurso sobre una agenda mono-recurso toca el constraint, el modelo, la disponibilidad y cada query del calendario — es de lo más caro que existe de cambiar después.

## Decisión

El modelo de agendamiento lleva **recurso explícito desde el día uno**:

- Tabla `scheduling_resources`; seed con un único recurso (la dueña).
- `scheduling_appointments.resource_id` NOT NULL; los bloques de disponibilidad (US-AGE-01) y bloqueos manuales (US-AGE-07) también se definen por recurso.
- El exclusion constraint incluye `resource_id with =` (ADR-0002): dos técnicas podrán atender en paralelo sin tocar el constraint.
- **La UI no muestra selector de recurso mientras exista uno solo.** El costo visible hoy es cero; el modelo ya está listo.

## Alternativas consideradas

- **Mono-recurso deliberado:** más simple hoy; ante un "posiblemente", convierte una contratación futura en una remodelación del corazón del sistema. Correcto solo con un "no, nunca" firme — que no fue la respuesta.
- **Multi-recurso completo ya** (selector, permisos por técnica, agendas comparadas): trabajo especulativo sin historia en el backlog. Excluido: solo se paga la columna, no la UI.

## Consecuencias

- Costo presente: una tabla, una FK, un término más en el constraint. Marginal.
- Alta futura de una técnica: fila nueva + UI de selección — sin migración estructural.
- Las queries de disponibilidad filtran por recurso desde el inicio; imposible olvidarlo después.
- Nada en `domain/` asume "hay exactamente un recurso".
