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
    falta: "dominio y aplicación completos (sin canales reales todavía); faltan la persistencia, los canales y el disparo del cron"
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

`US-NOT-03` pieza 2/N: la mitad de la aplicación (sin persistencia real todavía, contra puertos
en `application/ports.ts`: `SchedulingReadPort`, `ClientContactPort`, `ReminderRepository`,
`NotificationChannel` — ninguno implementado aquí, ARCH-005).

- `application/discover-reminders.ts`: lee de `scheduling` (vía el puerto) las citas activas que
  entran a la ventana de 24h + 2h de margen y crea el recordatorio pendiente si no existe
  (`insertIfAbsent`, idempotente). Prueba: `__tests__/discover-reminders.test.ts`.
- `application/reconcile-reminders.ts` (criterio 3): para cada recordatorio pendiente vuelve a
  consultar el estado vigente de la cita; si ya no está activa lo cancela, si cambió de hora o
  técnica lo reprograma. No depende de un evento de US-AGE-06 ni US-AGE-10 (ninguna existe
  todavía, `docs/process/DEPENDENCIES.md`): vuelve a preguntar en vez de escuchar un aviso que no
  existe. Prueba: `__tests__/reconcile-reminders.test.ts`.
- `application/send-due-reminders.ts` (criterios 2 y 4): envía los recordatorios vencidos por el
  canal primario y, si falla, por el respaldo (ADR-0006); sin contacto o con ambos canales
  fallidos reintenta hasta `MAX_REMINDER_ATTEMPTS` (5) y después queda `failed` con el motivo
  ("reintenta y queda registrado"). Prueba: `__tests__/send-due-reminders.test.ts`.
- `application/run-reminder-cycle.ts`: encadena descubrir → reconciliar → enviar; lo llamará el
  cron. Prueba: `__tests__/run-reminder-cycle.test.ts`.

## Qué no hace todavía

Persistencia real (los puertos hoy los implementan solo los dobles de prueba), canales reales
(Twilio/Resend, ADR-0006) y el disparo del cron: siguientes piezas de US-NOT-03.

## Contrato público (`index.ts`, ARCH-003)

Vacío todavía.
