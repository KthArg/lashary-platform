---
feature: notifications
dri: pendiente
estado: en_progreso
actualizado: 2026-10-28
historias:
  - id: US-NOT-01
    estado: no_iniciada
  - id: US-NOT-02
    estado: no_iniciada
  - id: US-NOT-03
    estado: terminada
    evidencia: "PR de cierre #577 (us/US-NOT-03 a main), con 23 piezas apiladas hacia la rama de la historia. Criterio 1 (envío automático 24h antes): computeReminderSendAt y discoverReminders; domain/__tests__/reminder.test.ts, application/__tests__/discover-reminders.test.ts. Criterio 2 (mensaje con fecha, hora y técnica): domain/reminder-message.ts (REMINDER_MESSAGE_TEXTS, formatStudioDateTime); domain/__tests__/reminder-message.test.ts, application/__tests__/send-due-reminders.test.ts. Criterio 3 (cancela o reprograma si la cita cambia): reconcile-reminders.ts; application/__tests__/reconcile-reminders.test.ts, incluida la corrección del líder del 2026-10-26 (libera el reclamo vencido antes de leer lo pendiente, para que la misma corrida cancele si la cita ya no es válida). Criterio 4 (reintenta y queda registrado): send-due-reminders.ts (MAX_REMINDER_ATTEMPTS), reclamo atómico FOR UPDATE SKIP LOCKED con TTL y tandas (notifications_claim_due_reminders, notifications_release_expired_claims); application/__tests__/send-due-reminders.test.ts, db/__tests__/reminder-repository.integration.test.ts (A6, contra Supabase local, incluido el reclamo doble simultáneo) y pgTAP notifications_reminders_staff_access.test.sql (13 aserciones, SEC-001/002). Decisión del líder del proyecto, comunicada el 2026-10-27: la historia pasa de en_progreso a terminada porque lo que falta —plantilla de WhatsApp aprobada por Meta, número de WhatsApp Business real, contenido del mensaje de la dueña del negocio, dominio verificado en Resend, disparo vía GitHub Actions, cuenta de staff del cron en producción— ya no es código sino configuración externa y decisiones de negocio; queda como checklist de activación para producción en la sección «Antes de producción» de este SPEC, no como deuda de la historia. A4 (rol dedicado del cron, sin ADR), B5 (reschedulePending no reinicia attempts/last_error) y B6 (recordatorio inmediato si la cita se reserva con menos de 24h) quedan registrados en `deuda` del frontmatter, con dueño (líder/PO); B8 (opt-in de WhatsApp) ya está cubierto por la fila de US-NOT-06 en docs/process/DEPENDENCIES.md."
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
  - que: "Consultas una por una: reconcileReminders pide la cita de cada recordatorio pendiente (getActiveById en scheduling/db/reminder-snapshots-repository.ts), discoverReminders inserta de a un recordatorio (insertIfAbsent) y sendDueReminders lee el contacto de cada uno (getContact). Con muchas citas dentro de la ventana son N consultas por corrida"
    aceptada_en: "Decision del lider del proyecto, 2026-10-27, cierre de US-NOT-03 (PR #577)"
    costo: "5h: API de lote en scheduling (cambio de contrato cross-feature, INT-003) para leer las citas por ids, insercion en lote en notifications y lectura de contactos en lote en clients, con sus pruebas de integracion"
  - que: "El canal de Twilio (twilio-whatsapp-channel.ts) se construyo y se retiro dentro de la misma pila: el historial de la pila conserva codigo y pruebas de un proveedor que nunca se uso. No queda codigo de Twilio en la feature"
    aceptada_en: "Decision del lider del proyecto, 2026-10-27, cierre de US-NOT-03 (PR #577); el cambio de proveedor lo registra ADR-0006"
    costo: "0h de codigo: es antecedente de proceso, ya documentado en ADR-0006 y STATUS.md"
  - que: "A4: el cron entra autenticado como una cuenta admin completa (NOTIFICATIONS_CRON_EMAIL/NOTIFICATIONS_CRON_PASSWORD) en vez de un rol dedicado con solo los permisos de notifications_reminders y las lecturas que necesita"
    aceptada_en: "Decision del lider del proyecto, 2026-10-27, cierre de US-NOT-03 (PR #577); la decision de arquitectura sigue pendiente de ADR (lider/PO)"
    costo: "4h: ADR, rol dedicado con politicas RLS minimas, cuenta del cron con ese rol y su pgTAP de aislamiento"
  - que: "B5: reschedulePending cambia startsAt, techniqueName y sendAt pero no reinicia attempts ni last_error; un recordatorio reprogramado hereda los intentos gastados antes del cambio"
    aceptada_en: "Decision del lider del proyecto, 2026-10-27, cierre de US-NOT-03 (PR #577)"
    costo: "1h: reiniciar attempts y last_error en reschedulePending, con prueba de integracion"
  - que: "B6: una cita reservada con menos de 24h de anticipacion no recibe recordatorio inmediato; su sendAt ya paso al crearse y el ciclo la trata como vencida sin avisar a la clienta de que el aviso llegara tarde"
    aceptada_en: "Decision del lider del proyecto, 2026-10-27, cierre de US-NOT-03 (PR #577); la regla de producto es del PO"
    costo: "3h: decision del PO (enviar de inmediato o no enviar) y ajuste de computeReminderSendAt/discoverReminders con sus pruebas"
defectos: []
---

# notifications

Notificaciones. El canal único (ADR-0006: WhatsApp directo contra la Graph API de Meta + Resend
como respaldo por email — decisión del PO, 2026-10-20/21 — registro de envíos) se construye con
US-NOT-03 (ADR-0007); el resto lo reusa vía el puerto que US-NOT-08 exige.

## Qué hace hoy

`US-NOT-03` terminada: el canal completo de recordatorios. Lo que queda abierto está en `deuda` del frontmatter y en «Antes de producción».

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

## Correcciones de la auditoría del 2026-10-23 (AUDIT.md, líder del proyecto)

El líder auditó la pila completa antes del cierre a `main` y encontró hallazgos de distinta
severidad. Lo que se corrigió, pieza por pieza. Esta pieza cubre A2, B1 y la mitad mecánica de
B4/M2; A3, M1 y M3 quedan en la siguiente pieza porque dependen de este mismo cambio de contrato
(`InsertOutcome`, `claimDuePending`) y de los predicados que agrega aquí.

- **A2 (reclamo atómico):** `domain/reminder.ts` agrega el estado `claimed`; `claimDuePending`
  (antes `listDuePending`) reclama en una sola instrucción `UPDATE ... WHERE status='pending'`, así
  que dos corridas del cron superpuestas no pueden mandar el mismo recordatorio dos veces. El
  estado `claimed` vive en la tabla desde la migración de la pieza 4
  (`20261026000000_notifications_reminders.sql`) — no hace falta una migración aparte hacia
  adelante: esa pieza se reescribió antes de llegar a `main` (revisión del líder del 2026-10-24,
  ver su SPEC).
- **B1 (índice redundante):** la misma migración de la pieza 4 no crea
  `idx_notifications_reminders_appointment` — el `UNIQUE` sobre `appointment_id` ya crea ese índice.
- **B4 (código muerto, parcial):** se quita `isReminderDue` (nadie la usaba fuera de su prueba) y
  se agrega `hasAppointmentAlreadyStarted`, el predicado que la siguiente pieza usa para A3
  (cancelar un recordatorio cuya cita ya pasó). Aquí solo se agrega el predicado y su prueba de
  dominio; `reconcileReminders` todavía no lo llama — ese cableado es A3, en la siguiente pieza.
- **M2 (`discovered` engañoso, parcial):** `insertIfAbsent` ahora informa si insertó de verdad o
  si ya existía (`23505`, `InsertOutcome.inserted`); `discoverReminders` ya usa ese dato para que
  `discovered` solo cuente inserciones reales. El resto de M2 (contadores de fallo por fila) es
  parte de M1 y queda en la siguiente pieza.

Pendientes explícitos de esta pieza, ya resueltos en la siguiente (`piece/US-NOT-03-16`): A3
(cancelar recordatorio de cita ya pasada), M1 (aislar fallos por fila en discover/reconcile/send)
y M3 (no gastar reintentos cuando ningún canal está configurado + acotar `last_error`). No se
dividieron más allá de esto porque `claimDuePending`/`InsertOutcome`/`ChannelSendInput.reminderId`
son un solo cambio de contrato: toda pieza que lo introduce debe ajustar mecánicamente cada
consumidor (si no, esa pieza no compila de forma aislada, que es justo lo que falló en el primer
intento de esta corrección — ver PR para el detalle). Separar más el contrato de sus consumidores
habría exigido un shim de compatibilidad temporal, que el proyecto evita.

- **A3 (recordatorio de una cita ya pasada):** `reconcileReminders` ahora recibe `clock`; si la
  cita sigue activa pero `startsAt` ya pasó (`hasAppointmentAlreadyStarted`, agregado en la pieza
  anterior), cancela el recordatorio en vez de dejarlo pendiente (antes solo cancelaba si la cita
  dejaba de estar activa). Cubre el caso del cron caído o una cita que no se cerró a tiempo
  (US-AGE-12 no existe todavía).
- **M1 (un error corta todo el lote):** `discoverReminders`, `reconcileReminders` y
  `sendDueReminders` ya no abortan la corrida completa por el error de una sola fila — cuentan el
  fallo (`failed`/`errored` en el resumen, con `console.error`) y siguen con las demás.
- **M3 (reintentos sin distinguir error permanente de transitorio):** si **ambos** canales
  reportan `channelNotConfigured`, el recordatorio queda `failed` de inmediato en vez de gastar
  los 5 intentos — un canal sin configurar no se arregla solo en 15 minutos. Si solo uno de los
  dos está sin configurar, sigue como transitorio (reintenta). También se acota `last_error` a
  500 caracteres antes de guardarlo.
- **A2 (parte 2, timeout e idempotencia):** los dos canales mandan `fetch` con
  `AbortSignal.timeout` (10s) — un proveedor colgado ya no agota la función sin marcar nada.
  `resendEmailChannel` manda `Idempotency-Key: notifications-reminder-<id>`: un reintento del
  mismo recordatorio no duplica el correo si Resend ya lo procesó. La Graph API de Meta no
  ofrece un mecanismo de idempotencia equivalente para mensajes de WhatsApp — sigue como
  limitación conocida.
- **A4 (mínimo, sin ADR):** `createSystemClient` devuelve `Result` en vez de lanzar;
  `runNotificationsReminderCycle` cierra la sesión (`signOut`) al terminar, con `try/finally`, así
  no se acumula una sesión nueva por cada corrida del cron. La decisión de fondo (rol dedicado en
  vez de una cuenta admin completa) sigue pendiente del líder/PO — ver «Falta para producción».
- **M1 (resto):** `cron-handler.ts` ahora envuelve la corrida en `try/catch`: una excepción
  inesperada ya no tira un 500 genérico sin registro, deja un `console.error` con la causa.
- **B3:** la comparación del secreto del cron usa `timingSafeEqual` en vez de `===`; la ruta solo
  acepta `POST` (ya no `GET`, que era solo para Vercel Cron — ver A5).
- **B7:** la versión de la Graph API (`v21.0`) ahora se puede fijar con
  `META_WHATSAPP_GRAPH_API_VERSION`; sigue con ese valor por defecto.
- **A5 (el disparo entregado contradecía al SPEC):** se quita `vercel.json` — el plan Hobby de
  Vercel solo permite cron diario, y el disparo real queda para GitHub Actions cuando se
  despliegue (decisión del líder, 2026-10-21, ya en «Falta para producción» nº 5). La ruta del
  cron ya no acepta `GET` (B3): GitHub Actions llama por `POST`.
- **M5 (la lectura de contacto traía `notes`):** `getClientContactForReminders` ahora hace su
  propia consulta a `clients_profiles` pidiendo solo `phone, email`, en vez de reusar `getClient`
  (que trae todas las columnas, incluida `notes`, y las descartaba después de leerlas).
- **B2 (comentario suelto):** `scheduling/index.ts` tenía un comentario de dos líneas que
  sobrevivió a la pasada de "sin comentarios" de la pieza 10; se quita porque el SPEC.md de
  `scheduling` ya documenta la misma razón.
- **B9 (ADR-0006 contradictorio):** los dos registros del 2026-10-21 (uno deja Twilio activable,
  el siguiente lo retira del todo) se contradicen a simple lectura; se anota el primero como
  superado por el segundo.

## Segunda revisión del líder (2026-10-24), sobre la corrección anterior

El líder revisó la corrección de la auditoría del 2026-10-23 y encontró dos fallos reales en el
reclamo atómico (A2) que esa corrección introdujo, más la confirmación de que la migración de A1
debía fusionarse en vez de solo renombrarse.

- **Migración (A1):** `20261020000000` y `20261020000001` (las dos que usó esta historia) quedaron
  ocupadas en `main` (por US-AGE-06, #443) y en ramas abiertas de US-AGE-07; ninguna de las dos de
  notifications había llegado nunca a `main`. Se fusionaron en una sola
  (`20261026000000_notifications_reminders.sql`, pieza 4 reescrita) con fecha posterior a todo lo
  usado en cualquier rama remota a esta fecha. Detalle completo en la pieza 4 (PR #452, etiqueta
  `excepcion-proceso`) y en el párrafo de "Persistencia" más arriba.
- **El reclamo no tenía vida limitada:** si el cron moría a mitad de lote, o `markSent` fallaba
  después de un envío exitoso, la fila quedaba `claimed` para siempre — nadie la volvía a intentar
  y tampoco avisaba. `notifications_claim_due_reminders` (función SQL,
  `20261026000001_notifications_claim_due_reminders_fn.sql`) reclama con `FOR UPDATE SKIP LOCKED`
  en tandas de `CLAIM_BATCH_SIZE` (50) en vez de reclamar todo de una vez, y vuelve a reclamar lo
  que lleva más de `CLAIM_TTL_MINUTES` (10) en `claimed` sin resolverse. Además, si falla la
  lectura del contacto (`getContact`), `sendOne` ahora llama a `releaseToPending` en vez de dejar
  la fila `claimed` — no gasta un intento, el siguiente ciclo la vuelve a ver `pending`. Probado a
  mano contra Supabase local (TTL vencido se reclama, TTL vigente no, tope de tanda respetado) y
  con pruebas unitarias de `releaseToPending` en `send-due-reminders.test.ts`; la prueba de
  integración del reclamo en sí (con `claimed` real, incluido el reclamo doble simultáneo) es
  parte de A6, pagada en la siguiente pieza (ver abajo).
- **`db.auth.signOut()` cerraba todas las sesiones de la cuenta del cron:** el scope por defecto
  es `global` (todas las sesiones del usuario en todos los dispositivos/procesos), así que dos
  corridas del cron solapadas se tumbaban una a la otra a mitad de ciclo. `closeSystemClient`
  (`shared/lib/supabase/system.ts`) ahora llama `signOut({ scope: 'local' })` — solo cierra la
  sesión de esa corrida. Prueba: `shared/lib/supabase/__tests__/system.test.ts`.

Quedan explícitamente sin resolver por código, con su razón: A4 (rol dedicado del cron en vez de
cuenta admin — decisión de arquitectura, pendiente de ADR), A7 (rebase de `us/US-NOT-03` contra
`main` — mecánico, se hace al cerrar la historia, no en una pieza intermedia), M4 (resto: *n+1* de
`scheduling/db/reminder-snapshots-repository.ts` al reconciliar uno por uno — exige una API de
lote nueva en `scheduling`, cambio de contrato cross-feature que no cabe en una pieza de
corrección), M6 (Twilio construido y luego retirado en la misma pila — señal de proceso, no un
defecto de código: ya documentado en ADR-0006 y STATUS.md), B5, B6 y B8 (requieren una decisión
del líder/PO sobre el mensaje a la clienta y el número real de WhatsApp Business, no código).

## A6, parte de notifications (pieza 21): prueba de integración del repositorio

El líder pidió explícitamente que esta deuda no quedara aceptada en el cierre. Esta pieza paga la
parte que le toca a `notifications`; las lecturas de `scheduling` y la de contacto de `clients`
son la siguiente pieza (INT-002: una pieza no puede tocar 3 features).

`notifications/db/__tests__/reminder-repository.integration.test.ts` (patrón de
`scheduling`/`payments`: `pg` solo para promover una sesión de prueba a staff vía
`auth_user_roles` y limpiar; se omite sola si Supabase local no está arriba) ejercita las siete
operaciones del repositorio contra una base real: `insertIfAbsent` idempotente (`23505` sin
duplicar), `listPending`, `reschedulePending`/`cancelPending` solo sobre `pending`,
`markSent`/`markRetry`/`markExhausted` solo sobre `claimed` (la guarda no actúa si la fila sigue
`pending`), `releaseToPending`, y **el reclamo real**: `claimDuePending` reclama lo vencido por
`send_at`, no lo que no vence, vuelve a reclamar un `claimed` cuyo TTL venció y no uno vigente (la
corrección del líder del 2026-10-24), y dos reclamos simultáneos (`Promise.all`) nunca reclaman la
misma fila dos veces (`FOR UPDATE SKIP LOCKED` probado de punta a punta, no solo a mano contra
SQL, como en la pieza 20). También RLS: anon no lee ni escribe.

Corrida contra Supabase local el 2026-10-24: 12/12 en verde, suite completa del proyecto y pgTAP
sin romper nada. La deuda de A6 (esta prueba) queda pagada.

## Tercera revisión del líder (2026-10-26): el reclamo se separa en dos, y se asegura el acceso

Revisando la pieza 20/21, el líder encontró un hallazgo nuevo y tres mejoras a
`notifications_claim_due_reminders`.

- **La reconciliación no revisaba lo reclamado por TTL vencido (hallazgo nuevo).** Cuando
  `claimDuePending` reclamaba una fila `claimed` cuyo TTL venció, el ciclo la mandaba a enviar
  directo — nunca pasaba otra vez por `reconcileReminders`, así que si la clienta había cancelado
  la cita o esta ya pasó mientras la fila estuvo atascada en `claimed`, se reenviaba igual sin
  revisar. Se corrige separando el reclamo en dos funciones SQL:
  - `notifications_release_expired_claims(p_now, p_claim_ttl_minutes)` — `claimed` vencido vuelve
    a `pending`. `reconcileReminders` la llama primero, antes de `listPending()`, así que la misma
    corrida revalida esas filas contra la cita (se cancelan si ya no es válida) antes de que
    `sendDueReminders` las pueda enviar. Prueba: `reconcile-reminders.test.ts` (ordena las llamadas
    y verifica que una fila liberada con cita cancelada se cancela, no se envía) y
    `reminder-repository.integration.test.ts` (TTL vencido se libera, TTL vigente no).
  - `notifications_claim_due_reminders(p_now, p_batch_size)` — ya sin TTL: solo reclama `pending`
    vencido por `send_at`, en tandas, con lock (sin cambios de fondo en su lógica, solo perdió el
    parámetro que ya no necesita).
- **`REVOKE ALL ... FROM PUBLIC, anon`** en ambas funciones, igual que el resto de funciones SQL
  del repo (p. ej. `catalog_delete_package`). El `EXECUTE` en sí lo tiene cualquier `authenticated`
  (SEC-001: la RLS es la frontera real); como clienta, el `UPDATE` de adentro no lanza `42501`
  (eso solo pasa con el `WITH CHECK` de un INSERT) — la RLS simplemente no le deja afectar ninguna
  fila. Prueba pgTAP en `notifications_reminders_staff_access.test.sql`: `lives_ok` como staff,
  `count = 0` como clienta, para las dos funciones.
- **`p_batch_size` NULL ya no deja el reclamo sin tope.** `LIMIT NULL` en Postgres es "sin límite"
  — con la tabla creciendo, un `NULL` por error reclamaría todo de una vez. Ambas funciones ahora
  son `LANGUAGE plpgsql` con un `RAISE EXCEPTION` si su entero llega `NULL` o `<= 0`, en vez de
  `LANGUAGE sql` sin guarda.
- **`make_interval` en vez de concatenar texto** (`p_claim_ttl_minutes || ' minutes'`) para armar
  el intervalo del TTL — más seguro, no depende de que Postgres interprete bien un texto armado a
  mano.
- **El lote (`CLAIM_BATCH_SIZE`) y el TTL (`CLAIM_TTL_MINUTES`) eran números sueltos que podían
  contradecirse:** con 50 filas y hasta 10s por canal (`CHANNEL_SEND_TIMEOUT_MS`, ahora compartida
  entre los dos canales en `channels/send-timeout.ts`, antes duplicada), el peor caso de una tanda
  (primario + respaldo agotan su tiempo en cada una) es 50 × 20s ≈ 16.7 minutos — más que los 10
  minutos del TTL. Si una corrida de verdad tardara eso, otra corrida solapada podría reclamar sus
  mismas filas antes de que termine, justo lo que el TTL existe para evitar. `CLAIM_BATCH_SIZE`
  ahora se calcula a partir de `CLAIM_TTL_MINUTES` y `CHANNEL_SEND_TIMEOUT_MS` (con un margen de
  seguridad de 2×) en vez de ser un número aparte: queda en 15, con un peor caso de ~5 minutos, la
  mitad del TTL. La ruta del cron (`src/app/api/cron/notifications-reminders/route.ts`) declara
  `maxDuration = 300` (segundos) a juego con ese mismo peor caso, para que Vercel corte una
  corrida colgada antes de que el TTL de otra la alcance.

`getClientContactForReminders` (`clients`) y `clientRepository` (`clients`, sin relación con esta
historia): ver el SPEC de `clients` — la consulta se movió a `db/` y `clientRepository` perdió su
parámetro `db` sin uso.

## Antes de producción

Decisión del líder del proyecto, comunicada el 2026-10-21 (código completo y probado con
credenciales reales) y revisada el 2026-10-27: lo de abajo ya no bloquea el cierre de la historia
— US-NOT-03 queda `terminada` (evidencia en el frontmatter) porque lo que falta es configuración y
decisiones de negocio externas, no código. Sigue siendo necesario resolverlo antes de que un
recordatorio real le llegue a una clienta; es un checklist de activación, no deuda de la historia.

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
   con una cuenta de staff y un cliente reales. `lashary-pruebas` ya tiene `scheduling` y las
   migraciones de `notifications`, así que `discoverReminders` (criterio 1: detectar la cita 24h
   antes) y `reconcileReminders` (criterio 3: cancelar o reprogramar si la cita cambia) se pueden
   probar ahí de punta a punta; falta correr esa prueba con datos reales.
5. **Disparo automático en producción.** `vercel.json` pide una corrida cada 15 minutos, pero el
   plan Hobby de Vercel solo permite cron jobs una vez al día. Decisión del líder (2026-10-21): se
   resuelve con GitHub Actions cuando el proyecto se despliegue, no ahora.
6. **Cuenta de staff del cron en producción — deliberadamente no creada.** Decisión del líder
   (2026-10-21): sin número de WhatsApp ni dominio de email reales, cualquier recordatorio que el
   cron intentara mandar en producción fallaría en los dos canales y, tras `MAX_REMINDER_ATTEMPTS`
   (5) intentos, quedaría en `failed` sin llegarle nunca a la clienta. Se creó la cuenta equivalente
   solo en `lashary-pruebas` (base de pruebas) para validar el código; la de producción se crea
   cuando los puntos 1 a 3 estén resueltos.

## Cierre (2026-10-27)

El líder del proyecto confirmó que US-NOT-03 pasa a `terminada` en el PR de cierre #577: lo
pendiente en «Antes de producción» es configuración externa y decisiones de negocio, no código,
así que ya no justifica dejar la historia `en_progreso` y bloquear en falso a quienes dependen de
ella (US-NOT-04, 05, 06, 07, 08 y US-CLI-06, docs/process/DEPENDENCIES.md). La etiqueta
`excepcion-proceso` que llevaba el PR de cierre se quitó: no hay criterio diferido que la
justifique (EST-007), los cuatro criterios de aceptación quedan demostrados con prueba (evidencia
en el frontmatter de esta historia).

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
