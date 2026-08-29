---
feature: notifications
dri: pendiente
estado: no_iniciada
actualizado: 2026-08-29
historias:
  - id: US-NOT-01
    estado: no_iniciada
  - id: US-NOT-02
    estado: no_iniciada
  - id: US-NOT-03
    estado: no_iniciada
  - id: US-NOT-04
    estado: no_iniciada
  - id: US-NOT-05
    estado: no_iniciada
  - id: US-NOT-06
    estado: no_iniciada
  - id: US-NOT-07
    estado: no_iniciada
  - id: US-NOT-08
    estado: no_iniciada
  - id: US-CLI-06
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# notifications

Notificaciones. El canal unico (ADR-0006: Twilio WhatsApp + email fallback, registro de envios) se construye con US-NOT-03 (ADR-0007); el resto lo reusa via el puerto que US-NOT-08 exige.

## Qué hace hoy

Hoy: no existe. Se detiene antes de todo.

## Contrato público

Sin contrato todavía. Al crearse, entra por `index.ts` (ARCH-003).
