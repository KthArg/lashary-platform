---
feature: notifications
dri: pendiente
estado: en_progreso
actualizado: 2026-10-21
historias:
  - id: US-NOT-01
    estado: no_iniciada
  - id: US-NOT-02
    estado: no_iniciada
  - id: US-NOT-03
    estado: en_progreso
    falta: "código completo y probado con credenciales reales (WhatsApp vía Graph API de Meta y Resend), pero no funcionando para una clienta real todavía — decisión del líder del proyecto, comunicada el 2026-10-21: queda en_progreso hasta que lo de abajo esté resuelto, aunque las 13 piezas ya se mergean a main. Ver la sección «Falta para producción» de este SPEC para el detalle y el porqué de cada punto: (1) plantilla de WhatsApp aprobada por Meta + número de WhatsApp Business real; (2) contenido del mensaje decidido por la dueña del negocio; (3) dominio propio verificado en Resend; (4) probar el ciclo automático completo (criterios 1 y 3) contra una base con scheduling, cosa que lashary-pruebas no tiene; (5) disparo automático en producción vía GitHub Actions (Vercel Hobby no sirve, solo corre cron una vez al día); (6) cuenta de staff del cron en producción, deliberadamente no creada todavía — sin WhatsApp/email reales los envíos fallarían igual a los 5 intentos (MAX_REMINDER_ATTEMPTS)."
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
- Persistencia (`db/reminder-repository.ts`, migración `20261020000000_notifications_reminders.sql`):
  tabla `notifications_reminders` (ARCH-006), sin FK a `scheduling_appointments` ni `clients_profiles`
  a propósito (es un registro operativo de envíos, no un dato de negocio permanente, a diferencia
  del FK de `payments` a `clients_profiles`, ADR-0009). RLS solo staff (`auth_is_staff()`), sin
  política de DELETE. Índices sobre `appointment_id` y `(status, send_at)` (PERF-003). Pruebas:
  pgTAP `supabase/tests/database/notifications_reminders_staff_access.test.sql` (control positivo
  de staff y negativo de clienta y anon, SEC-002) y `__tests__/rls-isolation.test.ts` (anon y
  clienta con tokens reales por PostgREST, mismo patrón de `auth`/`payments`/`scheduling`),
  corridas contra Supabase local el 2026-10-20.
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
  en `components[0].parameters` en vez de texto libre. `twilio-whatsapp-channel.ts` se retiró del
  todo (reemplazado por `meta-whatsapp-channel.ts` y cableado en `index.ts`); no queda código de
  Twilio en la feature. Pruebas: `channels/__tests__/meta-whatsapp-channel.test.ts` (sin plantilla
  y con plantilla) y `resend-email-channel.test.ts` (mock de `fetch`).
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

## Falta para producción

Decisión del líder del proyecto, comunicada el 2026-10-21: el código está completo y probado con
credenciales reales, pero la historia queda `en_progreso` — no `terminada` — hasta que lo de abajo
esté resuelto. Las 13 piezas se mergean a `main` igual; lo que falta es configuración y decisiones
de negocio, no código.

1. **Plantilla de WhatsApp aprobada por Meta + número de WhatsApp Business real.** Probado hoy
   (2026-10-21) contra el número de prueba de Meta: el canal manda y la clienta de prueba lo
   recibe, pero solo como texto libre y solo porque la sesión de 24h estaba abierta (la clienta le
   escribió primero al número). Con un número de WhatsApp Business real, Meta **no deja que el
   negocio le escriba primero a una clienta con texto libre** — exige una plantilla revisada y
   aprobada por Meta. El código ya soporta esto (`META_WHATSAPP_TEMPLATE_NAME`,
   `buildReminderTemplateVariables`, 2 variables en orden técnica → fecha y hora); falta crear esa
   plantilla en WhatsApp Manager, que la aprueben, y poner su nombre e idioma en las variables de
   entorno. Sin esto, un recordatorio a una clienta que nunca escribió primero se rechaza.
2. **Contenido del mensaje, decidido por la dueña del negocio.** El texto que usamos en las
   pruebas (`domain/reminder-message.ts`) es provisional. La plantilla que se somete a Meta para
   aprobación debe llevar el texto real que la dueña quiera — cambiarlo después de aprobado exige
   pedir una aprobación nueva, así que conviene decidirlo antes de crear la plantilla.
3. **Dominio propio verificado en Resend.** Hoy usa `onboarding@resend.dev`, el dominio de prueba
   de Resend: llega de forma confiable solo a la cuenta que creó la API key, no a cualquier
   clienta. Falta el dominio real del negocio y sus registros DNS (SPF/DKIM) verificados en Resend.
4. **Probar el ciclo automático completo (criterios 1 y 3).** Lo probado hasta ahora es
   `sendDueReminders` (criterios 2 y 4: enviar, reintentar, marcar estado) contra `lashary-pruebas`,
   con una cuenta de staff y un cliente reales — pero esa base no tiene `scheduling_appointments`,
   así que `discoverReminders` (criterio 1: detectar la cita 24h antes) y `reconcileReminders`
   (criterio 3: cancelar o reprogramar si la cita cambia) nunca se corrieron contra datos reales,
   solo contra dobles de prueba en los tests unitarios. Hace falta un entorno con `scheduling`
   completo para esa prueba de punta a punta.
5. **Disparo automático en producción.** `vercel.json` pide una corrida cada 15 minutos, pero el
   plan Hobby de Vercel solo permite cron jobs una vez al día. Decisión del líder (2026-10-21): se
   resuelve con GitHub Actions cuando el proyecto se despliegue, no ahora.
6. **Cuenta de staff del cron en producción — deliberadamente no creada.** Decisión del líder
   (2026-10-21): sin número de WhatsApp ni dominio de email reales, cualquier recordatorio que el
   cron intentara mandar en producción fallaría en los dos canales y, tras `MAX_REMINDER_ATTEMPTS`
   (5) intentos, quedaría en `failed` sin llegarle nunca a la clienta. Se creó la cuenta equivalente
   solo en `lashary-pruebas` (base de pruebas) para validar el código; la de producción se crea
   cuando los puntos 1 a 3 estén resueltos.

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
