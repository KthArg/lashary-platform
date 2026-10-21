---
feature: notifications
dri: pendiente
estado: en_progreso
actualizado: 2026-10-24
historias:
  - id: US-NOT-01
    estado: no_iniciada
  - id: US-NOT-02
    estado: no_iniciada
  - id: US-NOT-03
    estado: en_progreso
    falta: "el negocio todavía no tiene número de WhatsApp Business ni dominio de email propios (2026-10-21): activarlos es solo completar META_WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID, META_WHATSAPP_TEMPLATE_NAME (con la plantilla de 2 variables aprobada por Meta, ver domain/reminder-message.ts) y RESEND_API_KEY/FROM_ADDRESS, sin tocar código (ADR-0006). También falta la cuenta de staff del cron (NOTIFICATIONS_CRON_EMAIL/NOTIFICATIONS_CRON_PASSWORD), creada a mano en Supabase con rol admin/superadmin igual que la cuenta de la administradora (US-AUTH-01) — no depende del negocio y se puede crear ya. Verificación end-to-end contra un número de WhatsApp real, pendiente."
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
deuda:
  - que: "db/reminder-repository.ts no tiene prueba de integración propia contra Supabase local (a diferencia de scheduling/payments); su contrato real (insertIfAbsent idempotente, reschedulePending/cancelPending solo sobre pending, markRetry/markExhausted) se verificó manualmente aplicando la migración y corriendo supabase/tests/database/notifications_reminders_staff_access.test.sql, pero ese pgTAP no ejercita el repositorio TypeScript, solo SQL+RLS directo"
    aceptada_en: "PR de cierre us/US-NOT-03 a main"
    costo: "2h: *.integration.test.ts con pg para promover una sesión de prueba a staff (igual que scheduling/payments) y ejercitar las siete operaciones del repositorio contra una base real"
defectos: []
---

# notifications

Notificaciones. El canal único (ADR-0006: WhatsApp directo contra la Graph API de Meta + Resend
como respaldo por email — decisión del PO, 2026-10-20/21 — registro de envíos) se construye con
US-NOT-03 (ADR-0007); el resto lo reusa vía el puerto que US-NOT-08 exige.

## Qué hace hoy

`US-NOT-03` en progreso: primer código de la feature, el canal completo.

- Capa `domain/` (`reminder.ts`): `buildReminder` construye el recordatorio con sus invariantes
  (campos no vacíos, la cita debe empezar después de cuándo se programa) y calcula `sendAt` 24h
  antes de `startsAt` (`computeReminderSendAt`, criterio 1) usando `addHours` de `shared/date-math.ts`
  — la aritmética de fechas vive en `shared/` para que `domain/`/`application/` nunca construyan un
  `Date` con aritmética (DOM-004, lo escanea `check-domain-purity.sh`). Errores tipados en
  `domain/errors.ts` (DOM-006). `domain/reminder-message.ts` arma el texto externalizado
  (`REMINDER_MESSAGE_TEXTS`, DOM-009) con fecha y hora en `America/Costa_Rica` (`formatStudioDateTime`,
  DOM-003) y la técnica reservada (criterio 2). Pruebas: `domain/__tests__/reminder.test.ts` y
  `reminder-message.test.ts`.
- Capa `application/`: tres casos de uso encadenados por `run-reminder-cycle.ts` (lo llama el cron):
  - `discover-reminders.ts` — lee de `scheduling` (puerto `SchedulingReadPort`) las citas activas
    (`approved`/`confirmed`) que entran a la ventana de 24h + 2h de margen y crea el recordatorio
    pendiente si no existe (`insertIfAbsent`, idempotente). Prueba: `__tests__/discover-reminders.test.ts`.
  - `reconcile-reminders.ts` — criterio 3: para cada recordatorio pendiente vuelve a consultar el
    estado vigente de la cita contra `scheduling`; si ya no está activa lo cancela, si cambió de
    hora o técnica lo reprograma. No depende de un evento de US-AGE-06 ni US-AGE-10 (ninguna existe
    todavía, ver `docs/process/DEPENDENCIES.md`): vuelve a preguntar en vez de escuchar un aviso que
    no existe. Prueba: `__tests__/reconcile-reminders.test.ts`.
  - `send-due-reminders.ts` — criterios 2 y 4: envía los recordatorios vencidos por el canal
    primario (WhatsApp) y, si falla, por el respaldo (email, ADR-0006); sin contacto o con ambos
    canales fallidos reintenta hasta `MAX_REMINDER_ATTEMPTS` (5) y después queda `failed` con el
    motivo (criterio 4, "reintenta y queda registrado"). Prueba: `__tests__/send-due-reminders.test.ts`.
  - Puertos en `application/ports.ts`: `SchedulingReadPort`, `ClientContactPort`, `ReminderRepository`,
    `NotificationChannel` — ninguno los implementa esta capa (ARCH-005, el cross-feature entra por
    caso de uso público, nunca una consulta directa a `scheduling_appointments` ni `clients_profiles`).
- Persistencia (`db/reminder-repository.ts`, migración `20261026000000_notifications_reminders.sql`):
  tabla `notifications_reminders` (ARCH-006), sin FK a `scheduling_appointments` ni `clients_profiles`
  a propósito (es un registro operativo de envíos, no un dato de negocio permanente, a diferencia
  del FK de `payments` a `clients_profiles`, ADR-0009). RLS solo staff (`auth_is_staff()`), sin
  política de DELETE. Índice único sobre `appointment_id` (`notifications_reminders_one_per_appointment`)
  e índice sobre `(status, send_at)` (PERF-003); sin un segundo índice aparte sobre `appointment_id`
  (sería redundante con el UNIQUE). Pruebas: pgTAP
  `supabase/tests/database/notifications_reminders_staff_access.test.sql` (control positivo de
  staff y negativo de clienta y anon, SEC-002) y `__tests__/rls-isolation.test.ts` (anon y clienta
  con tokens reales por PostgREST, mismo patrón de `auth`/`payments`/`scheduling`), corridas contra
  Supabase local el 2026-10-20.

  La fecha de la migración (`20261026000000`) no es la original: `20261020000000` quedó ocupada en
  `main` por US-AGE-06 (#443) y en ramas abiertas por US-AGE-07, así que el líder pidió fusionarla
  con la que esta historia agregó después (reclamo atómico, `claimed`) en una sola, con fecha
  posterior a todo lo usado en cualquier rama remota a esta fecha. El estado `claimed` y la columna
  `claimed_at` nacen aquí (en vez de en una migración aparte hacia adelante) porque se reescribió
  esta pieza antes de que llegara a `main`: INT-008 prohíbe editar una migración ya mergeada, no
  reescribir una que todavía no salió de draft.
- Canales (`channels/`): `meta-whatsapp-channel.ts` y `resend-email-channel.ts`, REST directo con
  `fetch` (sin SDK nuevo) detrás de variables de entorno; sin configurar, el canal se declara
  `channelNotConfigured` en vez de fallar en producción por sorpresa (SEC-003/004). WhatsApp habla
  directo con la Graph API de Meta (developers.facebook.com), sin Twilio ni ningún otro
  intermediario. El negocio todavía no tiene número de WhatsApp ni dominio de email propios
  (2026-10-21): hasta tenerlos, ambos canales quedan listos para que activarlos sea solo completar
  variables de entorno, sin tocar código. Para WhatsApp en concreto: sin
  `META_WHATSAPP_TEMPLATE_NAME`, manda el mensaje como texto libre (`type: "text"`, solo funciona
  dentro de una sesión que la clienta ya abrió — sirve para el modo de prueba de Meta, sin
  verificación de negocio); con un número de WhatsApp Business real, Meta exige una plantilla
  aprobada para que el negocio le escriba primero a la clienta (que es justo lo que hace un
  recordatorio) — `domain/reminder-message.ts` expone `buildReminderTemplateVariables` con las 2
  variables en el orden que esa plantilla debe declarar (técnica, fecha y hora); con
  `META_WHATSAPP_TEMPLATE_NAME` configurado, el canal manda `type: "template"` con esas variables
  en `components[0].parameters` en vez de texto libre. Pruebas:
  `channels/__tests__/meta-whatsapp-channel.test.ts` (sin plantilla y con plantilla) y
  `resend-email-channel.test.ts` (mock de `fetch`).
- Disparo (`http/cron-handler.ts`, `src/app/api/cron/notifications-reminders/route.ts`, `vercel.json`):
  Vercel Cron llama cada 15 minutos con `Authorization: Bearer <CRON_SECRET>`; sin ese secreto
  configurado el endpoint se niega siempre (fail-closed). Sin sesión de usuario (sin cookies): el
  cron se autentica como una cuenta de staff (`shared/lib/supabase/system.ts`,
  `NOTIFICATIONS_CRON_EMAIL`/`NOTIFICATIONS_CRON_PASSWORD`) y queda sujeto a la misma RLS que
  cualquier sesión real — nunca la service-role key (SEC-001/003). Prueba: `http/__tests__/cron-handler.test.ts`.
- `index.ts` (`runNotificationsReminderCycle`) arma los adaptadores reales y expone la única puerta
  de entrada (ARCH-003): scheduling y clients por su índice público, los canales por ADR-0006.

## Qué no hace todavía

- No hay UI: ninguna pantalla muestra el registro de envíos ni deja cambiar el canal o reintentar a
  mano. No lo pide ningún criterio de US-NOT-03.
- US-NOT-01, 02, 04 a 08 y US-CLI-06 reusan el canal pero no están construidas.

## Contrato público (`index.ts`, ARCH-003)

- `runNotificationsReminderCycle` — corre un ciclo completo (descubrir → reconciliar → enviar).
  Consumidor: `receiveReminderCronRequest`.
- `receiveReminderCronRequest` — handler de la ruta de cron. Consumidor:
  `src/app/api/cron/notifications-reminders/route.ts`.
- Dominio y aplicación son superficie interna; ninguna otra feature los consume.

## Decisiones

- ADR-0006 (canal de notificaciones): WhatsApp directo contra la Graph API de Meta (sin Twilio,
  decisión del PO el 2026-10-21: lo exige quien pide el proyecto), Resend como respaldo por email
  (proveedor elegido por el PO el 2026-10-20).
