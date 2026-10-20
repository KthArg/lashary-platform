---
feature: notifications
dri: pendiente
estado: en_progreso
actualizado: 2026-10-20
historias:
  - id: US-NOT-01
    estado: no_iniciada
  - id: US-NOT-02
    estado: no_iniciada
  - id: US-NOT-03
    estado: en_progreso
    falta: "solo el dominio (criterios 1 y 2) está construido; faltan aplicación, persistencia, canales y el disparo del cron"
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

Notificaciones. El canal único (ADR-0006) se construye con US-NOT-03 (ADR-0007); el resto lo
reusa vía el puerto que US-NOT-08 exige.

## Qué hace hoy

`US-NOT-03` en progreso (pieza 1/N): solo el dominio.

- `domain/reminder.ts`: `buildReminder` construye el recordatorio con sus invariantes (campos no
  vacíos, la cita debe empezar después de cuándo se programa) y calcula `sendAt` 24h antes de
  `startsAt` (`computeReminderSendAt`, criterio 1) con `addHours` de `shared/date-math.ts` — la
  aritmética de fechas vive en `shared/` para que `domain/`/`application/` nunca construyan un
  `Date` con aritmética (DOM-004, lo escanea `check-domain-purity.sh`). `isReminderDue` y
  `hasExhaustedRetries` son los predicados puros que usará la aplicación.
- `domain/errors.ts`: errores tipados (DOM-006).
- `domain/reminder-message.ts`: texto externalizado (`REMINDER_MESSAGE_TEXTS`, DOM-009) con fecha
  y hora en `America/Costa_Rica` (`formatStudioDateTime`, DOM-003) y la técnica reservada
  (criterio 2).
- Pruebas: `domain/__tests__/reminder.test.ts` y `reminder-message.test.ts`.

## Qué no hace todavía

Aplicación, persistencia, canales (Twilio/Resend, ADR-0006) y el disparo del cron: siguientes
piezas de US-NOT-03.

## Contrato público (`index.ts`, ARCH-003)

Vacío todavía.
