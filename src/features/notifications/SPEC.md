---
feature: notifications
dri: pendiente
estado: en_progreso
actualizado: 2026-11-22
historias:
  - id: US-NOT-01
    estado: terminada
    evidencia: "Pila de 5 piezas sobre main: PRs #610 (1/5, tabla y RLS), #612 (2/5, trigger al reservar), #613 (3/5, dominio y repositorio), #615 (4/5, action y lectura) y #616 (5/5, panel lateral, cierra la historia). Criterio 1 (al reservar se genera el aviso en el panel): supabase/tests/database/scheduling_notify_booking_created.test.sql (reservar crea el aviso; una reserva fallida, una cita sin clienta o un cambio de hora no lo crean), ui/inbox/__tests__/admin-inbox.test.tsx y auth/__tests__/admin-auth.test.tsx (el layout lo carga para administradoras). Criterio 2 (clienta, servicio, fecha y hora): scheduling_notify_booking_created.test.sql, db/__tests__/inbox-repository.test.ts y admin-inbox.test.tsx. Criterio 3 (leído y no leído, persiste): supabase/tests/database/notifications_admin_inbox.test.sql (staff marca y desmarca, nadie borra ni fabrica avisos, la clienta y anon no los ven, SEC-002), application/__tests__/inbox.test.ts, inbox-repository.test.ts, ui/inbox/__tests__/inbox-actions.test.ts y admin-inbox.test.tsx, también con más de 20 avisos («Ver más»). Aislamiento con tokens reales de clienta y anon: __tests__/rls-isolation.test.ts. Si el aviso falla, la reserva igual se guarda, y una cita de paquete de US-AGE-04 usa el nombre del paquete: scheduling_notify_booking_created.test.sql. Probada a mano por José Loría en next dev contra Supabase local el 2026-10-29."
  - id: US-NOT-02
    estado: terminada
    evidencia: "PR de cierre us/US-NOT-02 a main, con 18 piezas apiladas (#660 a #670, #679 a #682, #684 a #686). Criterios 1 a 4 e ítems 9, 12 y 13: tabla criterio→prueba del cuerpo del PR de cierre (pgTAP scheduling_notify_appointment_changed, notifications_admin_inbox_appointment_changes, notifications_client_notices, scheduling_notify_reschedule_outcome, notifications_claim_client_notices, notifications_dropped_notices y notifications_reconcile_dropped_notices; vitest de dominio, aplicación, canales e interfaz; aislamiento por rol en __tests__/rls-isolation.test.ts). Decisión de Kenny del 2026-11-06: la historia cierra terminada con la deuda del frontmatter (visto bueno escrito del PO sobre el ítem 13, reseña externa de las funciones SECURITY DEFINER y dry_run con respaldo de las 10 migraciones), porque es de proceso y no de código; el envío real depende de la sección «Antes de producción»."
  - id: US-NOT-03
    estado: terminada
    evidencia: "PR de cierre #577 (us/US-NOT-03 a main), con 23 piezas apiladas hacia la rama de la historia. Criterio 1 (envío automático 24h antes): computeReminderSendAt y discoverReminders; domain/__tests__/reminder.test.ts, application/__tests__/discover-reminders.test.ts. Criterio 2 (mensaje con fecha, hora y técnica): domain/reminder-message.ts (REMINDER_MESSAGE_TEXTS, formatStudioDateTime); domain/__tests__/reminder-message.test.ts, application/__tests__/send-due-reminders.test.ts. Criterio 3 (cancela o reprograma si la cita cambia): reconcile-reminders.ts; application/__tests__/reconcile-reminders.test.ts, incluida la corrección del líder del 2026-10-26 (libera el reclamo vencido antes de leer lo pendiente, para que la misma corrida cancele si la cita ya no es válida). Criterio 4 (reintenta y queda registrado): send-due-reminders.ts (MAX_REMINDER_ATTEMPTS), reclamo atómico FOR UPDATE SKIP LOCKED con TTL y tandas (notifications_claim_due_reminders, notifications_release_expired_claims); application/__tests__/send-due-reminders.test.ts, db/__tests__/reminder-repository.integration.test.ts (A6, contra Supabase local, incluido el reclamo doble simultáneo) y pgTAP notifications_reminders_staff_access.test.sql (13 aserciones, SEC-001/002). Decisión del líder del proyecto, comunicada el 2026-10-27: la historia pasa de en_progreso a terminada porque lo que falta —plantilla de WhatsApp aprobada por Meta, número de WhatsApp Business real, contenido del mensaje de la dueña del negocio, dominio verificado en Resend, disparo vía GitHub Actions, cuenta de staff del cron en producción— ya no es código sino configuración externa y decisiones de negocio; queda como checklist de activación para producción en la sección «Antes de producción» de este SPEC, no como deuda de la historia. A4 (rol dedicado del cron, sin ADR), B5 (reschedulePending no reinicia attempts/last_error) y B6 (recordatorio inmediato si la cita se reserva con menos de 24h) quedan registrados en `deuda` del frontmatter, con dueño (líder/PO); B8 (opt-in de WhatsApp) ya está cubierto por la fila de US-NOT-06 en docs/process/DEPENDENCIES.md."
  - id: US-NOT-04
    estado: en_progreso
    falta: "Nada de código: los cuatro criterios están demostrados (tabla «Criterio y prueba»), con el enlace a /portal/cuenta en el criterio 2 y la prueba pgTAP notifications_payment_reminder_exceptions.test.sql en el criterio 4. Pendiente de proceso: visto bueno del PO (Kenny) sobre el rango de 1 a 30 días y el 7 por defecto y sobre las deudas registradas abajo, y reseña externa de la función SECURITY DEFINER notifications_set_payment_reminder_frequency_days (INT-005). Al cerrarse la historia en us/US-NOT-04 hacia main se marca terminada con su evidencia"
  - id: US-NOT-05
    estado: terminada
    evidencia: "PR de cierre #819 (us/US-NOT-05 a main, piezas 1 a 4) y piezas 5 a 21 fusionadas directamente a main tras el reacomodo del stack (#824 a #839; #840 quedó incluida en el squash de #839). Criterio 1 (fecha estimada con el intervalo del catálogo y la última cita completada): computeReapplicationDueDate (domain/reapplication-reminder.ts, pieza 2) y scheduling_reapplication_candidates() (migración 20261114000000, pieza 3); domain/__tests__/reapplication-reminder.test.ts, supabase/tests/database/scheduling_reapplication_candidates.test.sql. Criterio 2 (avisa cuando se acerca la fecha estimada): isReapplicationDue más el tope de 30 días vencidos isReapplicationExpired (pieza 19, hallazgo de la revisión), sendDueReapplications con reintentos hasta MAX_REMINDER_ATTEMPTS y sin gastar intento cuando es recuperable (sin contacto o sin canal configurado, piezas 10 y 19), un solo aviso por clienta cuando hay varias técnicas vencidas (pieza 19), y receiveReminderCronRequest llamando a runReapplicationReminderCycle en paralelo con el ciclo de recordatorios, aislado por su propio try/catch (pieza 18); application/__tests__/discover-reapplication-reminders.test.ts, application/__tests__/send-due-reapplications.test.ts, domain/__tests__/reapplication-message.test.ts, http/__tests__/cron-handler.test.ts, __tests__/reapplication-cycle.test.ts (pieza 20, antes sin ninguna prueba de esta capa de composición). Criterio 3 (la administradora configura los días de anticipación): tabla notifications_reapplication_settings y función notifications_set_reapplication_anticipation_days (piezas 12 y 13) con su pantalla en /admin/citas/re-aplicacion (piezas 15 a 17); buildReapplicationDiscoveryDeps aborta la corrida si falla leer la anticipación en vez de usar 7 por defecto en silencio (pieza 20, hallazgo de la revisión); ui/reapplication-settings/__tests__/*, supabase/tests/database/notifications_reapplication_settings.test.sql y notifications_set_reapplication_anticipation_days.test.sql, layout.test.tsx de /admin/citas. Criterio 4 (no se envía con morosidad activa ni con cita futura agendada): scheduling_reapplication_candidates() excluye cualquier cita futura activa (cualquier técnica, decisión del PO del 2026-11-13) y discoverDueReapplications excluye morosidad 'active' vía delinquency_client_states (DOM-012: 'pending_review' no bloquea todavía); scheduling_reapplication_candidates.test.sql, application/__tests__/discover-reapplication-reminders.test.ts. INT-010: login real como admin contra Supabase local, pantalla /admin/citas/re-aplicacion con el rango 1-30 visible y guardado funcionando (capturas en el PR de la pieza 17). Verificación final contra main: npx tsc --noEmit sin errores; npx vitest run con las mismas dos fallas preexistentes y ajenas de siempre (contaminación del seed local de catalog, .env.local apuntando a Supabase remoto); npx supabase test db, 94 archivos y 1251 pruebas, PASS. Deuda aceptada por Kenny Rodríguez el 2026-11-15 (ver 'deuda' arriba): el recordatorio de 24h y el aviso de re-aplicación pueden mandar dos mensajes de WhatsApp separados a la misma clienta en la misma corrida, al correr en paralelo sin coordinarse. Falta el disparador en producción (Vercel Cron o GitHub Actions) y la cuenta de sistema del cron en producción — checklist de activación externa, no código (mismo criterio que cerró US-NOT-03/07/08)."
  - id: US-NOT-06
    estado: no_iniciada
  - id: US-NOT-07
    estado: terminada
    evidencia: "PR de cierre #671 (us/US-NOT-07 a main), con 2 piezas apiladas: #672 (bitácora de intentos) y #702 (error del proveedor acotado). Criterio 1 (WhatsApp como canal por defecto): lo entregó US-NOT-03; application/__tests__/send-due-reminders.test.ts, «envía por el canal primario (WhatsApp) cuando funciona». Criterio 2 (envíos y fallos registrados): notifications_reminder_attempts (migraciones 20261104000000 y 20261104000001) y recordAttempt de sendDueReminders; application/__tests__/send-due-reminders.test.ts (bloque «bitácora de intentos», con envío por WhatsApp, fallo rescatado por correo, dos fallos, canal sin configurar, sin contacto, bitácora caída sin perder el envío y error sin teléfono), domain/__tests__/reminder-attempt.test.ts y provider-error.test.ts, db/__tests__/reminder-repository.integration.test.ts (contra Supabase local) y pgTAP notifications_reminder_attempts.test.sql (16 aserciones, SEC-001/002). Criterio 3 (medio alternativo si falla el canal por defecto): lo entregó US-NOT-03; send-due-reminders.test.ts, «cae al respaldo (email) si el canal primario falla (ADR-0006)» y «conserva el fallo de WhatsApp cuando el correo lo rescata». Sin pantalla: ningún criterio la pide. El respaldo por correo no envía a clientas reales mientras no se cumpla la sección «Antes de producción» (dominio verificado en Resend, número y plantilla de WhatsApp, disparo del ciclo); es la misma deuda de US-NOT-03, cuyo visto bueno escrito del PO sigue pendiente."
  - id: US-NOT-08
    estado: terminada
    evidencia: "PR de cierre #688 (us/US-NOT-08 a main), con 13 piezas apiladas: #689 a #701. Criterio 1 (mensaje de confirmación; por decisión del PO del 2026-11-05 sale al aprobar la cita, ADR-0003): trigger scheduling_appointments_notify_confirmation_request y notifications_record_confirmation_request (supabase/tests/database/scheduling_notify_confirmation_request.test.sql y notifications_confirmation_requests.test.sql, SEC-002), domain/__tests__/confirmation-request.test.ts (servicio, hora del estudio y enlace a Mis citas) y application/__tests__/send-confirmation-requests.test.ts. Criterio 2 (la respuesta cambia el estado y queda registrada con fecha y hora): scheduling_confirm_appointment y el evento scheduling.appointment.confirmed (scheduling_confirm_appointment.test.sql), application/__tests__/confirm-appointment.test.ts, ui/my-appointments/__tests__/perform-confirmation.test.ts y ConfirmAppointment.test.tsx; la cancelación usa la de US-AGE-06. Criterio 3 (advertencia del anticipo según la política vigente): ui/my-appointments/__tests__/ConfirmAppointment.test.tsx y my-appointments.test.ts; el aviso usa el anticipo requerido de la cita. Criterio 4 (citas sin confirmar dentro del plazo, destacadas en la vista diaria): scheduling_confirmation_policy.test.sql, domain/__tests__/appointment-confirmation.test.ts, ui/daily-agenda/__tests__/agenda-confirmation.test.tsx y la pantalla /admin/citas/confirmacion (ConfirmationPolicyForm.test.tsx, ConfirmationPolicyView.test.tsx). Criterio 5 (registro manual por la administradora): confirmAppointmentManuallyAction con segundo paso (agenda-confirmation.test.tsx) y scheduling_confirm_appointment.test.sql (staff, evento con actor staff). Criterio 6 (canal de US-NOT-07, sin reescribir al activar WhatsApp): application/send-confirmation-requests.ts corre dentro de runReminderCycle por el mismo canal primario y de respaldo (ADR-0006); application/__tests__/send-confirmation-requests.test.ts, run-reminder-cycle.test.ts y channels/__tests__. El envío revisa que la solicitud siga reclamada antes de mandar y, si se canceló mientras tanto, no manda (cuenta cancelled); queda una ventana de milisegundos que se documenta en este SPEC. Lo que falta para que un mensaje salga en producción no es código: número de WhatsApp Business, plantillas aprobadas por Meta (META_WHATSAPP_CONFIRMATION_TEMPLATE_NAME), dominio de Resend y disparo del ciclo; es la checklist «Antes de producción» de este SPEC y la misma deuda de US-NOT-03. Las 48 horas por defecto las confirmó el PO (Kenny) el 2026-11-06 (docs/process/DEPENDENCIES.md). Las citas ya aprobadas al desplegar no se rellenan (decisión del PO). Pendiente de proceso, no de código: capturas de #693, #694 y #696, y el visto bueno escrito del PO sobre los criterios 1, 3 y 6."
  - id: US-CLI-06
    estado: terminada
    evidencia: "Pila de 10 piezas sobre main: #797 (1/10, contratos), #798 (2/10, función de catalog), #800 (3/10, tabla y funciones), #801 (4/10, nota en el cierre), #813 (5/10, mensaje y canales), #814 (6/10, envío en el cron), #815 (7/10, campo en el diálogo de cierre), #816 (8/10, Tus cuidados en Mis citas), #817 (9/10, expediente y cierre) y #850 (10/10, correcciones de la auditoría del 2026-11-15). Criterio 1 (texto de cuidados por técnica): lo cumple US-AGE-08; catalog/domain/techniques/__tests__/technique.test.ts («rechaza texto de cuidados vacío»), catalog/ui/techniques/__tests__/technique-schema.test.ts y catalog/__tests__/seed.integration.test.ts. Criterio 2 (al cerrar, por el canal configurado, la técnica efectivamente aplicada): pgTAP catalog_service_aftercare.test.sql, notifications_aftercare_messages.test.sql y scheduling_close_appointment_aftercare.test.sql; vitest application/__tests__/send-aftercare-messages.test.ts y run-reminder-cycle.test.ts, domain/__tests__/aftercare-message-text.test.ts, db/__tests__/aftercare-delivery-repository.test.ts y channels/__tests__ (meta-whatsapp-channel.test.ts, resend-email-channel.test.ts). El envío real depende de «Antes de producción», punto 8, igual que US-NOT-03. Criterio 3 (nota específica para la clienta): scheduling_close_appointment_aftercare.test.sql y, en scheduling, ui/daily-agenda/__tests__/close-appointment-schema.test.ts, close-appointment-actions.test.ts, UnclosedAppointments.test.tsx y close-aftercare-note-limit.test.ts, y db/__tests__/appointment-closing-repository.test.ts. Criterio 4 (visible en el expediente y en la vista de citas): ui/my-aftercare/__tests__/MyAftercare.test.tsx, db/__tests__/client-aftercare-repository.test.ts, ui/client-record-aftercare/__tests__/ClientRecordAftercare.test.tsx, db/__tests__/client-record-aftercare-repository.test.ts, application/__tests__/client-record-aftercare.test.ts y __tests__/rls-isolation.test.ts (sin el cruce A/B con datos, que cubre el pgTAP de la 3/9). Pendiente de proceso, no de código: visto bueno del PO sobre el ítem 3 de «Criterios diferidos» (sin efecto) y capturas de las piezas 7/10 y 8/10 (la de 8/10 en lashary-pruebas, cuando CI aplique las migraciones), y el visto bueno del PO sobre lo que lleva el WhatsApp (M3 de la auditoría del 2026-11-15: por ahora va el texto aplanado, opción C)."
flags: []
deuda:
  - que: "Consultas una por una: reconcileReminders pide la cita de cada recordatorio pendiente (getActiveById en scheduling/db/reminder-snapshots-repository.ts), discoverReminders inserta de a un recordatorio (insertIfAbsent) y sendDueReminders lee el contacto de cada uno (getContact). Con muchas citas dentro de la ventana son N consultas por corrida"
    aceptada_en: "Aprobada verbalmente por Kenny (code reviewer con facultad de decision por regla del PO), registrada el 2026-10-28 en docs/process/DEPENDENCIES.md; el visto bueno escrito de KthArg (PO) sigue pendiente"
    costo: "5h: API de lote en scheduling (cambio de contrato cross-feature, INT-003) para leer las citas por ids, insercion en lote en notifications y lectura de contactos en lote en clients, con sus pruebas de integracion"
  - que: "A4: el cron entra autenticado como una cuenta admin completa (NOTIFICATIONS_CRON_EMAIL/NOTIFICATIONS_CRON_PASSWORD) en vez de un rol dedicado con solo los permisos de notifications_reminders y las lecturas que necesita. La decision de arquitectura (rol dedicado) esta pendiente de ADR, del lider/PO"
    aceptada_en: "Aprobada verbalmente por Kenny (code reviewer con facultad de decision por regla del PO), registrada el 2026-10-28 en docs/process/DEPENDENCIES.md; el visto bueno escrito de KthArg (PO) sigue pendiente"
    costo: "4h: ADR, rol dedicado con politicas RLS minimas, cuenta del cron con ese rol y su pgTAP de aislamiento"
  - que: "B5: reschedulePending cambia startsAt, techniqueName y sendAt pero no reinicia attempts ni last_error; un recordatorio reprogramado hereda los intentos gastados antes del cambio"
    aceptada_en: "Aprobada verbalmente por Kenny (code reviewer con facultad de decision por regla del PO), registrada el 2026-10-28 en docs/process/DEPENDENCIES.md; el visto bueno escrito de KthArg (PO) sigue pendiente"
    costo: "1h: reiniciar attempts y last_error en reschedulePending, con prueba de integracion"
  - que: "B6: una cita reservada con menos de 24h de anticipacion manda su recordatorio en el siguiente ciclo (buildReminder solo exige que la cita empiece despues de createdAt, el recordatorio queda con sendAt en el pasado y el siguiente claim lo reclama). Si eso debe enviarse o no es regla de producto, decision del PO"
    aceptada_en: "Aprobada verbalmente por Kenny (code reviewer con facultad de decision por regla del PO), registrada el 2026-10-28 en docs/process/DEPENDENCIES.md; el visto bueno escrito de KthArg (PO) sigue pendiente"
    costo: "3h: decision del PO (enviar de inmediato o no enviar) y ajuste de computeReminderSendAt/discoverReminders con sus pruebas"
  - que: "Visto bueno escrito del PO (KthArg) sobre el ítem 13 de US-NOT-02 (aviso a la clienta cuando su reagendado se rechaza o vence): no consta por escrito en docs/process/DEPENDENCIES.md"
    aceptada_en: "Decisión de Kenny del 2026-11-06 al cerrar US-NOT-02 como terminada"
    costo: "0.5h: dejarlo escrito con fecha en DEPENDENCIES.md"
  - que: "Reseña externa (INT-005) de las 13 funciones SECURITY DEFINER de la pila de US-NOT-02, y dry_run de supabase-migrate con respaldo antes de aplicar las 10 migraciones (20261103000000 a 20261107000002; cinco anteriores a la última de main, dependen de --include-all)"
    aceptada_en: "Decisión de Kenny del 2026-11-06 al cerrar US-NOT-02 como terminada; el dry_run lo corre un admin"
    costo: "2h: reseña externa y corrida del dry_run"
  - que: "US-CLI-06: si notifications_record_aftercare falla al cerrar la cita, la cita queda cerrada sin indicaciones (aftercare_recorded false y scheduling.aftercare.failed en la bitácora) y no hay forma de registrarlas ni de reenviar después; tampoco se puede reintentar a mano una indicación en estado failed (M2 y B9 de la auditoría del 2026-11-15)"
    aceptada_en: "Decisión de José Loría del 2026-11-15 al corregir la auditoría de US-CLI-06: el caso es raro (aftercare_text es NOT NULL) y deja rastro en la bitácora"
    costo: "6h: función SECURITY DEFINER para el personal que registre o reencole las indicaciones de una cita completed, botón en el expediente, pgTAP y pruebas de la pantalla"
  - que: "US-CLI-06: «Tus cuidados» muestra las últimas MY_AFTERCARE_PAGE_SIZE (10) y el expediente las últimas CLIENT_RECORD_AFTERCARE_PAGE_SIZE (20), sin «ver más» ni aviso de que hay más (B1 de la auditoría del 2026-11-15)"
    aceptada_en: "Decisión de José Loría del 2026-11-15: a la escala de un estudio una clienta con más de 10 cierres es improbable (PERF-001)"
    costo: "3h: paginación con cursor en los dos repositorios, botón «Ver más» y sus pruebas"
  - que: "runNotificationsReminderCycle y runReapplicationReminderCycle corren en paralelo desde el mismo receiveReminderCronRequest (pieza 18/21), cada uno con su propio cliente de sistema y sin coordinarse entre sí. Si una clienta cae en la ventana de los dos ciclos en la misma corrida (recordatorio de 24h de una cita y aviso de re-aplicación de una técnica), recibe dos mensajes de WhatsApp separados en vez de uno combinado: más costo de mensajería (si Meta cobra por conversación) y una experiencia peor, aunque cada ciclo sigue siendo idempotente por su propia clave de ciclo (sin duplicado dentro del mismo tipo de aviso)"
    aceptada_en: "Aceptado por Kenny Rodríguez el 2026-11-15 (docs/process/DEPENDENCIES.md)"
    costo: "3h: una cola compartida por clienta entre los dos ciclos (o combinar los dos mensajes en uno solo cuando coinciden en la misma corrida), con su prueba de integración"
  - que: "US-NOT-04: el saldo de hoy se pide con una llamada por clienta a la que ya le toca el recordatorio (clientOwedAmountGateway.owedBy, que llama a delinquency_booking_block), no por lote; con muchas morosas el ciclo hace tantas llamadas como recordatorios pendientes"
    aceptada_en: "Elegida por Bayron el 2026-11-17 entre tres opciones, en la conversación de trabajo de US-NOT-04; sin visto bueno del PO todavía"
    costo: "2h: pasar a una sola llamada por lote a payments_appointment_balances ahora que delinquency_list_active_cases de US-MOR-05 ya está en main, con sus pruebas"
  - que: "US-NOT-04: runPaymentReminderCycle corre en paralelo con los ciclos de recordatorios y de re-aplicación, sin coordinarse; una clienta con morosidad activa puede recibir el recordatorio de pago y otro aviso por WhatsApp en la misma corrida"
    aceptada_en: "Pendiente: Kenny Rodríguez aceptó esta deuda el 2026-11-15 para dos ciclos; no consta para el tercero"
    costo: "3h: la misma cola compartida por clienta entre los ciclos cubriría los tres"
  - que: "US-NOT-04: el rango de 1 a 30 días y el 7 por defecto de la frecuencia del recordatorio los propuso el equipo de desarrollo, copiando los de la anticipación de US-NOT-05; el PO no los confirmó"
    aceptada_en: "Pendiente del PO (Kenny)"
    costo: "0.5h: confirmarlos por escrito en docs/process/DEPENDENCIES.md, o cambiar el rango en la migración nueva, el dominio y los textos"
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
  (`REMINDER_MESSAGE_TEXTS`, DOM-009) con fecha y hora en `America/Costa_Rica` (`formatStudioDateTime`
  de `shared/studio-time`, que también usa la bandeja, DOM-003) y la técnica reservada (criterio 2). Pruebas: `domain/__tests__/reminder.test.ts` y
  `reminder-message.test.ts`.
- Capa `application/`: tres casos de uso encadenados por `run-reminder-cycle.ts` (lo llama el cron).
  Antes de los tres, el ciclo le pide a `scheduling` que venza los reagendados que nadie decidió a
  tiempo (puerto `SchedulingMaintenancePort`, `expireSchedulingUndecidedReschedules`; regla de
  US-AGE-10 aprobada por el PO el 2026-10-29): la cita vuelve a su horario aprobado y el paso de
  descubrir le crea el recordatorio en la misma corrida. Si ese paso falla, el ciclo sigue y lo cuenta
  en `expireFailed`; el resumen trae `expiredReschedules`. Prueba: `__tests__/run-reminder-cycle.test.ts`.
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
- Disparo (`http/cron-handler.ts`, `src/app/api/cron/notifications-reminders/route.ts`): la ruta
  recibe un `POST` con `Authorization: Bearer <CRON_SECRET>`; sin ese secreto configurado el endpoint
  se niega siempre (fail-closed). La comprobación del secreto (`isAuthorizedCronRequest`, en tiempo constante) vive en `shared/lib/cron-auth.ts`, compartida con el cron de detección de morosidad de `delinquency`. Hoy nadie la llama: no hay `vercel.json` ni un workflow de GitHub
  Actions que lo haga (ver «Antes de producción», punto 5, y la activación en `docs/process/DEPENDENCIES.md`). Sin sesión de usuario (sin cookies): el
  cron se autentica como una cuenta de staff (`shared/lib/supabase/system.ts`,
  `NOTIFICATIONS_CRON_EMAIL`/`NOTIFICATIONS_CRON_PASSWORD`) y queda sujeto a la misma RLS que
  cualquier sesión real — nunca la service-role key (SEC-001/003). Prueba de la autenticación: `shared/lib/__tests__/cron-auth.test.ts`.
- `index.ts` (`runNotificationsReminderCycle`) arma los adaptadores reales y expone la única puerta
  de entrada (ARCH-003): scheduling y clients por su índice público, los canales por ADR-0006.

## US-NOT-01: bandeja de avisos de la administradora

`notifications_admin_inbox` guarda un aviso por reserva (`UNIQUE (kind, appointment_id)`), con una
copia de clienta, servicio y hora: el aviso cuenta lo que pasó al reservar aunque la cita cambie
después, y US-NOT-02 necesita el horario anterior. `read_at` vacío es «no leído»; nunca se borra.

- Lee y marca solo staff (SEC-001): `SELECT` y `UPDATE (read_at)`, nada más; sin `INSERT` ni `DELETE`.
- Solo escribe `notifications_record_booking`, sin `EXECUTE` para `anon` ni `authenticated`: nadie
  puede fabricar avisos por PostgREST.
- Prueba: `supabase/tests/database/notifications_admin_inbox.test.sql` (staff, clienta y anon, SEC-002)
  y `__tests__/rls-isolation.test.ts`, con tokens reales de clienta y anon contra PostgREST. Los
  clientes de esa prueba no guardan la sesión: si la guardaran, el anónimo heredaría la de la clienta.
- Lo llama el trigger de `scheduling` al reservar (criterio 1), en la misma transacción: si la reserva
  falla, no hay aviso. Al revés no: si el aviso falla, el trigger lo atrapa (`RAISE WARNING`) y la
  reserva se guarda, porque la reserva importa más que el aviso. El servicio es la técnica o, en una
  cita de paquete (US-AGE-04), el paquete; un nombre vacío cae a «Clienta» o «Servicio». Prueba:
  `supabase/tests/database/scheduling_notify_booking_created.test.sql`.
- En la app: `domain/inbox-notice.ts` (`InboxNotice`, `INBOX_LIMIT = 20`), `db/inbox-repository.ts`
  (páginas de 20 con `range` y si hay más, conteo de todos los no leídos sin traer filas, `setReadAt`)
  y `application/inbox.ts` (`loadInbox`, `loadMoreNotices`, `markNotice` con reloj inyectado, DOM-004).
  Si la RLS no deja tocar el aviso, el `UPDATE` no afecta filas y se informa `notice-not-found`. Un
  fallo de la base es `InboxStorageFailed` con su causa, nunca una bandeja vacía. Pruebas:
  `domain/__tests__/inbox-notice.test.ts`, `db/__tests__/inbox-repository.test.ts` y `application/__tests__/inbox.test.ts`.
- Borde (`ui/inbox/`): `loadAdminInbox` es una lectura de servidor normal, no `'use server'`; la RLS
  deja sin avisos a quien no es staff. `markNoticeAction` exige `requireAdminSession`, valida con zod
  (`id` uuid, `read` booleano), devuelve `{ ok: false, error }` en vez de lanzar, y refresca el layout
  de `/admin` (`ADMIN_PORTAL_ROUTES.root`) para que cambie el contador. `loadMoreNoticesAction` trae
  la página siguiente de 20: es una lectura con `'use server'` a propósito, porque el layout no recibe
  parámetros de la URL y «ver más» se pide desde el panel; por eso exige `requireAdminSession`, valida
  el desplazamiento con zod y la RLS sigue detrás. Prueba: `ui/inbox/__tests__/inbox-actions.test.ts`.
- Panel (`ui/inbox/components/AdminInbox/`): botón en el menú lateral con el número de no leídos y un
  `<dialog>` modal que sale por la izquierda; el `<dialog>` nativo da foco atrapado, Escape y vuelta del
  foco al botón. El layout de `/admin` carga la bandeja y se la pasa a `AdminSidebar` como hueco
  (`notifications`), así `auth` no importa nada de `notifications`. Estados: vacío, error con
  reintento y guardado en curso (botones deshabilitados); la bandeja llega cargada con el layout.
  El contador cuenta todos los no leídos; si hay más de 20 avisos, «Ver más» trae los siguientes 20
  y se pueden marcar igual. Al cerrar el panel se descarta lo cargado de más y vuelve a los primeros
  20. Prueba: `ui/inbox/__tests__/admin-inbox.test.tsx` y `auth/__tests__/admin-auth.test.tsx` (el layout).

## US-NOT-02: avisos de cancelación y reagendado

Criterios del backlog, todos cubiertos:

1. Al cancelarse o reagendarse una cita se genera una notificación con los datos correspondientes.
2. En una cancelación, la notificación indica si la clienta perdió el anticipo según la política.
3. En un reagendado, la notificación muestra el horario anterior y el nuevo.
4. El espacio liberado se refleja automáticamente en el calendario.

Recibe además tres criterios trasladados (`docs/process/DEPENDENCIES.md`, «Criterios trasladados»): el ítem 9
(notificar la cancelación, de US-AGE-06), el 12 (notificar el reagendado, de US-AGE-10) y el 13 (la clienta
recibe aviso cuando su reagendado se rechaza o vence, con el horario que conserva).

Decisiones:

- Ítem 13: aprobado por el PO (Kenny); Jose Lorenzo comunicó el 2026-11-03 que basta esa aprobación.
- Ítem 13: el aviso a la clienta llega por dos caminos, una nota en «Mis citas» y un mensaje por el canal de
  US-NOT-03 (WhatsApp con respaldo por correo, ADR-0006). El mensaje queda listo para cuando el negocio tenga
  número y dominio («Antes de producción»).
- `notifications` es dueña de las tablas de avisos y de las funciones que los registran; `scheduling` dispara
  el registro con triggers sobre `audit_events`, en la misma transacción que el cambio.

### Avisos de la administradora

- Bandeja: `notifications_admin_inbox` suma los tipos `appointment_cancelled` y `appointment_rescheduled`, con
  `event_id`, `previous_starts_at` y `forfeited_deposit`; un cambio deja un aviso por evento. Migración
  `20261103000000`. Prueba: pgTAP `notifications_admin_inbox_appointment_changes.test.sql`.
- Registro: `notifications_record_cancellation` y `notifications_record_reschedule` son `SECURITY DEFINER` sin
  `EXECUTE` para nadie. Pruebas: `__tests__/rls-isolation.test.ts` (tokens reales de clienta y anon).
- Disparo: el trigger `audit_events_notify_appointment_changed` (migración `20261103000001`) cubre los criterios
  1 a 3 y deja el espacio liberado fuera de `scheduling_busy_ranges` (criterio 4). Prueba: pgTAP
  `scheduling_notify_appointment_changed.test.sql`.
- Morosidad por revisar (US-MOR-01, migración `20261108000005`): `notifications_admin_inbox` suma el tipo `delinquency_review`, con
  `pending_amount` y sin servicio ni hora de cita (`service_name` y `starts_at` pasan a ser opcionales; la restricción
  `notifications_admin_inbox_fields_by_kind` fija las columnas de cada tipo). `notifications_record_delinquency_review` es `SECURITY
  DEFINER` sin `EXECUTE` para nadie y la llama el trigger de `delinquency` ([delinquency-api.md](../../../docs/contracts/delinquency-api.md)).
  Prueba: pgTAP `delinquency_notify_case_detected.test.sql`.
- App (US-MOR-01, pieza 16): `InboxNotice` suma `DelinquencyReviewNotice` (`pending`, sin servicio ni hora). `inbox-repository` pide
  `pending_amount` y arma el aviso; `ui/inbox/utils/notice-lines.ts` dice «{clienta} tiene un pago sin registrar por revisar» y
  «Debe ₡X», y devuelve una acción hacia `/admin/morosidades` (la ruta es una constante propia, `DELINQUENCY_REVIEW_PATH`: el panel es un componente de cliente y el entry point de `delinquency`, el único importable por ARCH-003, arrastra código de servidor; una prueba la compara con `DELINQUENCY_ADMIN_PATH`) que `AdminInbox`
  dibuja como enlace y que cierra el panel al hacer clic. Los avisos de una cita no llevan enlace. Pruebas:
  `db/__tests__/inbox-repository.test.ts`, `ui/inbox/__tests__/notice-lines.test.ts` y `admin-inbox.test.tsx`.
- App: `InboxNotice` es una unión por `kind`; `ui/inbox/utils/notice-lines.ts` dice el monto perdido o «No
  perdió el anticipo» y el horario anterior y el nuevo. Pruebas: `domain/__tests__/inbox-notice.test.ts`,
  `db/__tests__/inbox-repository.test.ts`, `ui/inbox/__tests__/notice-lines.test.ts` y `admin-inbox.test.tsx`.

### Avisos de la clienta (ítem 13)

- Tabla: `notifications_client_notices` guarda un aviso por evento (`reschedule_rejected` o `reschedule_expired`)
  con el servicio, el horario pedido y el que conserva, más el estado de su envío. La clienta lee solo los suyos;
  staff solo cambia el envío. Migración `20261103000002`. Prueba: pgTAP `notifications_client_notices.test.sql`.
- Un solo aviso por vencimiento: vencer rechaza antes, así que `notifications_record_reschedule_outcome` borra
  el rechazo pendiente de la misma transacción al registrar el vencimiento.
- Disparo: el trigger `audit_events_notify_reschedule_outcome` (migración `20261103000003`). Prueba: pgTAP
  `scheduling_notify_reschedule_outcome.test.sql`.
- Vigencia: `notifications_discard_client_notices` borra los avisos de la cita cuando se reagenda o cancela de
  nuevo (trigger `audit_events_discard_superseded_client_notices`, migración `20261106000000`; `notifications_discard_client_notices` recibe el instante del evento y solo borra lo anterior). Prueba: pgTAP
  `notifications_client_notices_only_live.test.sql`.
- Avisos perdidos: los triggers de `scheduling` no tumban el cambio si el aviso falla; lo que se pierde queda en
  `notifications_dropped_notices` (un registro por evento, con acción, error recortado a 500 e intentos), que solo
  staff lee y marca como resuelto. El cron lo reintenta solo con `notifications_reconcile_dropped_notices`
  (`SECURITY DEFINER`, solo staff): relee el evento de `audit_events` y repite el registro que le corresponde, que
  es idempotente por evento; si sale bien lo marca resuelto y si no suma un intento. Reintenta primero los que menos
  intentos llevan y deja de tocar los que ya gastaron cinco, que siguen contados como abiertos, para que unos
  pocos irrecuperables no frenen a los nuevos. Migraciones `20261107000000`, `20261107000001` y
  `20261107000002`. Pruebas: pgTAP `notifications_dropped_notices.test.sql` y
  `notifications_reconcile_dropped_notices.test.sql`, `db/__tests__/dropped-notices-repository.test.ts` y
  `__tests__/rls-isolation.test.ts`.
- Datos internos: la clienta y staff leen por la tabla solo el contenido y `status`; `attempts`, `last_error`,
  `claimed_at`, `last_channel` y `sent_at` no tienen `SELECT` (migración `20261106000001`). Pruebas: pgTAP
  `notifications_client_notices_private_columns.test.sql` y `__tests__/rls-isolation.test.ts`.
- Nota en «Mis citas»: `loadClientNotices` pide los avisos cuyo horario conservado no pasó, los más recientes
  primero y con tope `CLIENT_NOTICES_LIMIT` (5, PERF-002). `ClientNotices` (`ui/client-notices/`) los pinta; la
  ruta `src/app/portal/citas/mis-citas/page.tsx` los compone en el hueco `notices` de `scheduling` (ARCH-005).
  Pruebas: `application/__tests__/client-notices.test.ts`, `db/__tests__/client-notice-repository.test.ts` y
  `ui/client-notices/__tests__/ClientNotices.test.tsx`.

### Envío por el cron

- Canales: `ChannelSendInput` lleva `messageId` y `purpose` (`reminder`, `appointment_confirmation` o
  `reschedule_outcome`, US-NOT-08 y US-NOT-02). WhatsApp elige la plantilla del propósito con un `Record` exhaustivo
  (`META_WHATSAPP_TEMPLATE_NAME`, `META_WHATSAPP_CONFIRMATION_TEMPLATE_NAME` o
  `META_WHATSAPP_RESCHEDULE_OUTCOME_TEMPLATE_NAME`): si se agrega un propósito, TypeScript avisa que falta su plantilla.
  Con la plantilla de recordatorio pero sin la del propósito no sale por WhatsApp (`channelNotConfigured`) y pasa al
  correo. El correo lleva un asunto por propósito y la clave de idempotencia `notifications-<propósito>-<mensaje>`.
  Pruebas: `channels/__tests__/meta-whatsapp-channel.test.ts` y `resend-email-channel.test.ts`, con los tres propósitos.
- Reclamo: `notifications_claim_client_notices` toma de a tandas, con `FOR UPDATE SKIP LOCKED`, los avisos
  pendientes o con reclamo vencido cuyo horario conservado no pasó y cuya cita sigue viva (`approved` o
  `confirmed`) en ese mismo horario. Es `SECURITY DEFINER` y rechaza con `42501` a quien no es staff. Pruebas:
  pgTAP `notifications_claim_client_notices.test.sql` y
  `db/__tests__/client-notice-delivery-repository.test.ts`.
- Envío: `sendClientNotices` manda cada aviso por WhatsApp y, si falla, por correo; sin contacto o con los dos
  canales caídos cuenta un intento y, al quinto o sin canal configurado, queda `failed`. Si no se pudo leer el
  contacto, suelta el aviso sin gastar un intento. `runReminderCycle` corre los bloques en este orden: vencer los
  reagendados, reintentar los avisos perdidos, avisos a la clienta, confirmaciones de asistencia (US-NOT-08),
  descubrimiento, reconciliación y recordatorios. El resumen suma los tres bloques (`notices*`, `confirmations*` y
  `dropped*`) sin quitar campos de ninguno; si quedan avisos perdidos abiertos, lo escribe con `logError`, y un fallo en
  uno de esos bloques no corta el ciclo: lo cuenta en `noticesFailed`, `confirmationsFailed` o `droppedFailed`. Pruebas:
  `application/__tests__/send-client-notices.test.ts` y `run-reminder-cycle.test.ts` (el orden y que un fallo no corta).
- Tiempo del ciclo: el TTL del reclamo (`CLAIM_TTL_MINUTES`, 10), la tanda (`CLAIM_BATCH_SIZE`, 2) y la duración
  de la ruta (`maxDuration` igual a `CYCLE_MAX_DURATION_SECONDS`, 300) van atados en `db/claim-limits.ts`, y los
  repositorios que reclaman mensajes (recordatorios, avisos a la clienta, confirmaciones e indicaciones de cuidado)
  importan de ahí la misma tanda y el mismo TTL. El ciclo corre un envío en serie por cada tipo de `MESSAGE_PURPOSES`
  (`application/ports.ts`): `MESSAGE_KINDS_SENT_PER_CYCLE` sale de su largo, hoy 5 (incluye `reapplication_reminder`: su lote no usa
  `CLAIM_BATCH_SIZE`, pero se cuenta para reservarle tiempo dentro de los mismos 300 s), y la tanda se calcula con uno más de
  margen. Cada mensaje puede gastar dos canales a `CHANNEL_SEND_TIMEOUT_MS` (10 s): con 5 tipos y tanda 2 el peor caso es
  2 × 5 × 20 s = 200 s y sobran 100 s para vencer, reintentar, descubrir y reconciliar. Agregar un tipo a
  `MESSAGE_PURPOSES` recalcula la tanda sola. Corrección M1 de la auditoría del 2026-11-15. Prueba:
  `db/__tests__/claim-limits.test.ts`, que lee el `maxDuration` de la ruta y comprueba el peor caso con todos los tipos
  y su margen.
- Las filas se validan con Zod; una forma inesperada es un error que no guarda el texto de Postgres. Los fallos
  del envío de avisos se registran con `logError` (`shared/logger.ts`).

### Pendiente antes de mergear el cierre

- La revisión externa de las funciones `SECURITY DEFINER` (INT-005) ya está: Kenny, code reviewer con facultad de decisión
  por regla del PO, aprobó #660 a #670, y joselhcr aprobó #679 a #682, #684, #685 y #686.
- Orden de entrada con US-NOT-07 y US-NOT-08: resuelto. Ambas entraron primero a `main` (#671 y #688 a #701); este cierre
  trajo `main` y unió los cambios: `MessagePurpose` lleva los tres propósitos, `ChannelSendInput` se conserva,
  `sendDueReminders` conserva la bitácora de intentos de US-NOT-07 y las tandas de los tres repositorios salen de
  `db/claim-limits.ts`.
- Visto bueno escrito del ítem 13 por el PO, reseña externa de las funciones `SECURITY DEFINER` y `dry_run` con respaldo:
  la historia cierra `terminada` con estos tres pendientes registrados en `deuda` del frontmatter.

## US-NOT-07: recordatorio por correo y bitácora de intentos

WhatsApp como canal por defecto y el correo cuando falla ya los entregó US-NOT-03 (`sendDueReminders`,
ADR-0006); el «medio alternativo por definir» del backlog es el correo por Resend. Esta historia agrega
lo que faltaba del criterio 2: antes, si WhatsApp fallaba y el correo funcionaba, el error de WhatsApp
se descartaba, y cada reintento pisaba `last_error`.

- `notifications_reminder_attempts` (`20261104000000_notifications_reminder_attempts.sql`) guarda una
  fila por intento y canal: `attempt_number`, `channel`, `outcome` (`sent`, `failed`, `not_configured`,
  `no_contact`), `error` y `attempted_at`. Sin contacto no hay canal, y solo `sent` va sin error (CHECK).
- Es append-only: staff solo tiene SELECT e INSERT; la clienta y anon no entran (SEC-001/002). Como
  cualquier staff puede insertar filas, es una bitácora operativa, no de auditoría: sirve para
  diagnosticar envíos, no para demostrar qué pasó.
- `error` guarda el motivo del fallo: el texto que devuelve el proveedor (Meta, Resend), o el mensaje
  fijo de `sin contacto registrado`. Al venir del proveedor puede traer datos de la clienta, y solo
  staff lo lee.
- `sanitizeProviderError` (`domain/provider-error.ts`) limpia ese texto antes de guardarlo, también en
  `last_error`: oculta los teléfonos, que Meta a veces incluye, y corta a 500 caracteres más la
  elipsis. Oculta toda serie de 8 dígitos o más, así que no borra los códigos de Meta, más cortos, pero
  sí podría borrar otro número largo (una fecha ISO, un timestamp o el `phone_number_id` de Meta).
  No oculta otros datos de la clienta.
- La base no depende de la app: `20261104000001_notifications_reminder_attempts_error_length.sql`
  limita `error` a 501 caracteres (CHECK).
- `sendDueReminders` registra cada canal apenas responde, con `recordAttempt` del repositorio. Si la
  lectura del contacto falla no hay fila: no se intentó enviar y el recordatorio vuelve a `pending`.
- Si la bitácora falla, se registra en el log y el envío sigue: perder un recordatorio ya enviado o
  reenviarlo sería peor que perder la fila.
- `attempted_at` es la hora en que empezó la tanda del ciclo, la misma para todos los intentos de la
  corrida: el orden entre WhatsApp y el correo se lee por `channel`, no por el tiempo.
- `notifications_reminders.last_error` y `last_channel` siguen como resumen del último estado.

El título del backlog dice «además de WhatsApp», pero el criterio y ADR-0006 piden correo solo si
WhatsApp falla: no se envían los dos siempre.

## US-NOT-08: confirmación de asistencia

- `scheduling_confirm_appointment` (migración `20261105010000`, feature `scheduling`) lleva una cita de `approved` a `confirmed`. La usa la dueña o el staff; cualquier otra persona recibe el mismo error que con una cita inexistente (SEC-005). Confirmar dos veces no repite el evento `scheduling.appointment.confirmed`, que guarda fecha, hora y quién confirmó (`client` o `staff`). Prueba: `supabase/tests/database/scheduling_confirm_appointment.test.sql`.
- `scheduling_confirmation_policy` (migración `20261105010001`, feature `scheduling`) guarda las horas antes de la cita desde las que una cita sin confirmar se destaca: 48 por defecto, de 0 a 720, y 0 no destaca. Solo se cambia con `scheduling_change_confirmation_deadline`, que exige administradora y deja el evento `scheduling.confirmation_deadline.changed`. Prueba: `supabase/tests/database/scheduling_confirmation_policy.test.sql`.
- Capa TypeScript en `scheduling`: `application/confirm-appointment.ts` (`confirmAppointment`, `getConfirmationDeadline`, `changeConfirmationDeadline`), `db/appointment-confirmation-repository.ts` y `domain/appointment-confirmation.ts`. `isConfirmationOverdue` destaca una cita `approved`, con clienta, que aún no empieza y entra en el plazo. Errores tipados: `AppointmentNotConfirmable` e `InvalidConfirmationDeadline`. Pruebas: `domain/__tests__/appointment-confirmation.test.ts`, `application/__tests__/confirm-appointment.test.ts` y `db/__tests__/appointment-confirmation-repository.test.ts`, de `scheduling`.
- «Mis citas» (`ui/my-appointments` de `scheduling`): una cita `approved` muestra «Confirmar asistencia» (`ConfirmAppointment`, `confirmAppointmentAction`). Al confirmar, la clienta ve la política vigente con las horas de la ventana; sin anticipo requerido o sin ventana no se advierte pérdida (el aviso usa el anticipo requerido de la cita, no el registrado, que nace en 0 hasta US-MOR-03). Una cita `confirmed` con anticipo la recuerda en la tarjeta, también si la confirmó la administradora. Pruebas: `perform-confirmation.test.ts`, `ConfirmAppointment.test.tsx` y `my-appointments.test.ts`.
- Agenda diaria (`ui/daily-agenda` de `scheduling`): con el plazo de `scheduling_confirmation_policy`, una cita sin confirmar dentro del plazo sale con borde y la etiqueta «Sin confirmar». Si el plazo no se puede leer, un aviso lo dice en vez de dar las citas por confirmadas. Toda cita `approved` con clienta que aún no empieza ofrece «Registrar confirmación» (`confirmAppointmentManuallyAction`, exige sesión de administradora). Pide un segundo paso con la advertencia de que no se deshace desde el sistema. Prueba: `ui/daily-agenda/__tests__/agenda-confirmation.test.tsx`.
- Lógica del plazo en el panel (`ui/confirmation-policy` de `scheduling`): `changeConfirmationDeadlineAction`, `confirmationPolicyService` (exige sesión de administradora) y la validación del formulario. Pruebas: `perform-change-deadline.test.ts`, `load-confirmation-policy.test.ts` y `confirmation-policy-actions.test.ts`.
- Pantalla del plazo: `/admin/citas/confirmacion` (`ConfirmationPolicyPage`), con su pestaña «Confirmación» en la sección de citas. Pruebas: `ConfirmationPolicyForm.test.tsx`, `ConfirmationPolicyView.test.tsx` y `src/app/admin/citas/layout.test.tsx`.
- `notifications_confirmation_requests` (migración `20261105010002`): una solicitud por cita y horario, sin FK a tablas ajenas. Solo el staff la lee y actualiza; `notifications_record_confirmation_request` y `notifications_cancel_confirmation_request` no tienen `EXECUTE` para ningún rol de la API, y `notifications_claim_confirmation_requests` reclama en tandas sin tomar citas que ya empezaron. Prueba: `supabase/tests/database/notifications_confirmation_requests.test.sql` (SEC-002).
- Trigger `scheduling_appointments_notify_confirmation_request` (migración `20261105010003`, feature `scheduling`): una cita con clienta que pasa a `approved` deja la solicitud, y una que deja de estarlo retira lo que no salió. Si `notifications` falla, la cita conserva su estado y el fallo deja `scheduling.confirmation_request.failed` en la bitácora. Prueba: `supabase/tests/database/scheduling_notify_confirmation_request.test.sql`.
- Dos casos que no se tratan aparte. Las citas ya aprobadas cuando se aplican las migraciones no tienen solicitud (el trigger actúa al pasar a `approved`) y no reciben el mensaje: no se rellenan, decisión del PO del 2026-11-06; la agenda las destaca al entrar en el plazo y la administradora puede registrar la confirmación a mano. Una cita aprobada con menos horas de antelación que el plazo (48 por defecto) sale «Sin confirmar» desde el principio, porque el plazo cuenta horas antes de la cita (registro del 2026-11-05, punto d); es solo una etiqueta y nada se cancela solo.
- Mensaje y persistencia en TypeScript: `domain/confirmation-request.ts` arma el texto con el servicio, la hora del estudio y el enlace a «Mis citas», y las 3 variables de la plantilla de Meta en ese orden. `db/confirmation-request-repository.ts` solo actualiza filas `claimed`, así que una solicitud cancelada durante el envío sigue cancelada. Pruebas: `domain/__tests__/confirmation-request.test.ts` y `db/__tests__/confirmation-request-repository.test.ts`.
- Canales por tipo de mensaje: `ChannelSendInput` lleva `messageId` (antes `reminderId`) y `purpose` (`reminder` o `appointment_confirmation`). WhatsApp usa `META_WHATSAPP_TEMPLATE_NAME` para el recordatorio y `META_WHATSAPP_CONFIRMATION_TEMPLATE_NAME` para la confirmación; sin ninguna plantilla manda texto libre, y con la del recordatorio pero sin la de confirmación responde `channelNotConfigured` y el mensaje pasa al correo. El correo toma el asunto del tipo y la clave `notifications-<tipo>-<id>`; la del recordatorio no cambia. Es la misma forma de #667 (US-NOT-02): al integrar queda un solo `MessagePurpose` con los tres tipos. Pruebas: `channels/__tests__/meta-whatsapp-channel.test.ts` y `resend-email-channel.test.ts`.
- Envío: `application/send-confirmation-requests.ts` corre dentro de `runReminderCycle`, después de los recordatorios, por el mismo canal primario y de respaldo (criterio 6, ADR-0006). El mensaje enlaza `NEXT_PUBLIC_SITE_URL` más `SCHEDULING_MY_APPOINTMENTS_PATH` (`domain/appointments-url.ts`); si esa variable no es una URL absoluta http(s), no se manda ninguna confirmación (sin enlace no hay medio para confirmar) y el resumen lo cuenta en `confirmationsFailed`, sin frenar los recordatorios. Reintenta hasta `MAX_REMINDER_ATTEMPTS`; sin ningún canal configurado la solicitud vuelve a `pending` sin gastar un intento y el resumen la cuenta en `confirmationsUnconfigured`, `confirmationsCancelled`, `confirmationsCancelled`, así que no se pierde si el cron se activa antes que el canal. El error del proveedor se guarda con `sanitizeProviderError` (sin teléfonos, US-NOT-07). Si reclamar falla, el resumen lo cuenta en `confirmationsFailed` y la corrida conserva lo demás. Prueba: `application/__tests__/send-confirmation-requests.test.ts` y `run-reminder-cycle.test.ts`. Antes de mandar se relee que la solicitud siga reclamada: si la clienta confirmó entre el reclamo y el envío, no se manda y cuenta como `cancelled`. Queda una ventana de milisegundos entre esa lectura y la llamada al canal, que no se puede cerrar (el proveedor no tiene transacción); si ahí se cancela, `markSent` no encuentra la fila reclamada y también cuenta `cancelled`, no `sent`.

## US-CLI-06: indicaciones de cuidado post-tratamiento

Al cerrar una cita como completada, la clienta recibe por el canal de ADR-0006 las indicaciones de
cuidado de lo que se le aplicó, más una nota opcional de la administradora, y las puede volver a leer
en «Mis citas»; la administradora las ve en la ficha de la clienta. Terminada el 2026-11-13.

**Cómo queda armado** (contratos en [catalog-api.md](../../../docs/contracts/catalog-api.md#indicaciones-de-cuidado-sql--contrato-de-us-cli-06)
y [scheduling-api.md](../../../docs/contracts/scheduling-api.md#indicaciones-de-cuidado-al-cerrar-us-cli-06)):

- Criterio 1 (texto de cuidados por técnica): ya existe desde US-AGE-08, `catalog_techniques.aftercare_text`
  obligatorio y su campo en el formulario de técnicas. Esta historia no lo cambia; lo cita como prueba.
- `scheduling_close_appointment` recibe `p_aftercare_note` y, al cerrar como `completed`, llama a
  `notifications_record_aftercare` en la misma transacción. Si `notifications` falla, la cita se cierra
  igual, devuelve `aftercare_recorded = false` y deja `scheduling.aftercare.failed` en la bitácora.
- `notifications_record_aftercare` pide el texto vigente a `catalog_service_aftercare` (de la técnica
  aplicada o de todas las técnicas del paquete) y lo **copia** en `notifications_aftercare_messages`, junto
  con la nota. Desde ahí la indicación no depende del catálogo: editar la técnica no cambia lo que ya se
  envió. Una fila por cita.
- El ciclo del cron (`runReminderCycle`) reclama esas filas en tandas y las manda por el canal primario y
  el de respaldo, como la confirmación de US-NOT-08. WhatsApp manda el servicio, los cuidados y la nota en una
  línea, y el enlace a «Mis citas», con la plantilla `META_WHATSAPP_AFTERCARE_TEMPLATE_NAME` (desde la 10/10;
  antes solo el servicio y el enlace); el correo lleva el texto completo.
- Lo que ve la clienta no depende del envío: la indicación aparece en «Mis citas» desde el cierre, aunque el
  canal no esté configurado todavía («Antes de producción»). La administradora ve además el estado del envío.

**Piezas** (pila sobre `main`; 3 migraciones, una por pieza, INT-008):

| Pieza | Qué trae | Feature |
|---|---|---|
| 1/10 | Contratos, esta sección y la corrección de `docs/process/DEPENDENCIES.md` | docs |
| 2/10 | `catalog_service_aftercare` y su pgTAP | catalog |
| 3/10 | `notifications_aftercare_messages`, RLS, `notifications_record_aftercare` y la función de reclamo, con su pgTAP (SEC-002) | notifications |
| 4/10 | `p_aftercare_note` en `scheduling_close_appointment` y su pgTAP | scheduling |
| 5/10 | Mensaje de las indicaciones, repositorio de entrega y soporte en los canales (plantilla y su línea en «Antes de producción») | notifications |
| 6/10 | Caso de uso de envío y su lugar en el ciclo del cron | notifications |
| 7/10 | Campo «Indicaciones para esta clienta» en el diálogo de cierre | scheduling |
| 8/10 | «Tus cuidados» en «Mis citas», con estados vacío, carga y error (UI-003) y aislamiento por rol | notifications |
| 9/10 | Sección «Indicaciones enviadas» en la pestaña Expediente y cierre de la historia | notifications |
| 10/10 | Correcciones de la auditoría del 2026-11-15: `MESSAGE_PURPOSES` y `claim-limits.ts` (M1), pruebas de fecha sin depender de Node (M6), una sola constante de la tabla (B2), tuteo (B4), la evidencia con los PRs (M5) y el texto de cuidados en la plantilla de WhatsApp (M3, opción C) | notifications |

**Hecho** (pieza 3/9, 2026-11-13):

- Migración `supabase/migrations/20261115000001_notifications_aftercare_messages.sql`.
- Tabla `notifications_aftercare_messages`: una fila por cita (`UNIQUE (appointment_id)`), sin FK a otras features, con RLS (la clienta lee las suyas, el staff lee y actualiza).
- `notifications_record_aftercare`: copia el texto de `catalog_service_aftercare` y la nota recortada; sin `EXECUTE` para ningún rol de la API.
- `notifications_claim_aftercare_messages`: reclamo en tandas con TTL y `FOR UPDATE SKIP LOCKED`, solo staff.
- Prueba pgTAP `supabase/tests/database/notifications_aftercare_messages.test.sql` (24 aserciones, SEC-002).

**Hecho** (pieza 4/9, 2026-11-13):

- Migración `supabase/migrations/20261115000002_scheduling_close_appointment_aftercare.sql`: `scheduling_close_appointment` con `p_aftercare_note` y la columna `aftercare_recorded`; llama a `notifications_record_aftercare` al cerrar como `completed` y, si falla, deja `scheduling.aftercare.failed` en la bitácora.
- Prueba pgTAP `supabase/tests/database/scheduling_close_appointment_aftercare.test.sql` (19 aserciones).

**Hecho** (pieza 5/9, 2026-11-13):

- `domain/aftercare-message.ts` (`AftercareMessage`, `AFTERCARE_NOTE_MAX_LENGTH`, el mismo tope que el CHECK de SQL) y `domain/aftercare-message-text.ts` (`AFTERCARE_MESSAGE_TEXTS`, `buildAftercareMessage`, `buildAftercareTemplateVariables`).
- Puerto `AftercareDeliveryRepository` y `db/aftercare-delivery-repository.ts`: reclamo en tandas con los límites de `claim-limits.ts` y actualizaciones solo sobre filas `claimed`.
- Canales: `aftercare` en `MessagePurpose`, `META_WHATSAPP_AFTERCARE_TEMPLATE_NAME` y el asunto del correo.

**Hecho** (pieza 6/9, 2026-11-13):

- `application/send-aftercare-messages.ts` (`sendAftercareMessages`): reclama con el reloj inyectado, lee el contacto, manda por el canal primario y cae al de respaldo con propósito `aftercare`; marca enviado, reintento o agotado (`MAX_REMINDER_ATTEMPTS`), y sin ningún canal configurado la devuelve a pendiente sin gastar un intento. Sin contacto cuenta un intento fallido.
- Corre en `runReminderCycle` justo después de los avisos a la clienta (US-NOT-02); un fallo se cuenta en `aftercareFailed` y no frena los demás pasos. Resumen: `aftercareSent`, `aftercareRetried`, `aftercareExhausted`, `aftercareErrored`, `aftercareUnconfigured`, `aftercareFailed`. Sin `NEXT_PUBLIC_SITE_URL` válida no se manda y se cuenta como fallo, como las confirmaciones.
- Prueba `application/__tests__/send-aftercare-messages.test.ts` (8 casos) y casos nuevos en `application/__tests__/run-reminder-cycle.test.ts`.

**Hecho** (pieza 7/9, 2026-11-13):

- Campo «Indicaciones para esta clienta» en el diálogo de cierre de la agenda diaria (`scheduling`, ver su SPEC): la nota viaja como `p_aftercare_note` de `scheduling_close_appointment`.
- El tope de 1000 caracteres vive en tres lugares: el CHECK de `notifications_aftercare_messages`, `AFTERCARE_NOTE_MAX_LENGTH` (`domain/aftercare-message.ts`) y `CLOSE_AFTERCARE_NOTE_MAX_LENGTH` (`scheduling/ui/daily-agenda/constants/close-appointment.constants.ts`). Scheduling no importa `AFTERCARE_NOTE_MAX_LENGTH` porque el barrel de `notifications` importa `scheduling` (ciclo) y arrastraría `node:crypto` y el cliente de sistema al bundle del navegador. `AFTERCARE_NOTE_MAX_LENGTH` se exporta en `index.ts` solo para que una prueba compare los dos valores de TypeScript: `scheduling/ui/daily-agenda/__tests__/close-aftercare-note-limit.test.ts`. El CHECK de SQL lo cubre `supabase/tests/database/notifications_aftercare_messages.test.sql` (nota de 1001 caracteres).

**Hecho** (pieza 8/9, 2026-11-13):

- `application/client-aftercare.ts` (`loadClientAftercare`), puerto `ClientAftercareRepository` y `db/client-aftercare-repository.ts`: lee de `notifications_aftercare_messages` solo `id, appointment_id, service_name, aftercare_text, client_note, created_at`, las más recientes primero y con tope `MY_AFTERCARE_PAGE_SIZE` (10) en la consulta. No filtra por clienta: lo hace la RLS (`select_own`). Un fallo de la base o una fila mal formada es `AftercareStorageFailed`, nunca una lista vacía.
- `ui/my-aftercare/`: `loadMyAftercare` (módulo de servidor, no action) y el componente de servidor `MyAftercare` («Tus cuidados»: servicio, fecha del cierre en hora del estudio, texto con saltos de línea y la nota con su título si existe). Vacío con aviso y error con `role="alert"`; la carga la da `src/app/portal/citas/mis-citas/loading.tsx`.
- `src/app/portal/citas/mis-citas/page.tsx` compone `ClientNotices` y `MyAftercare` en el espacio `notices` de `MyAppointmentsPage`, sin cambios en `scheduling`.
- Pruebas: `db/__tests__/client-aftercare-repository.test.ts`, `application/__tests__/client-aftercare.test.ts`, `ui/my-aftercare/__tests__/MyAftercare.test.tsx` y un caso nuevo en `__tests__/rls-isolation.test.ts` (anon sin lectura, columnas internas denegadas; sin filas sembradas porque la prueba no usa service-role).

**Hecho** (pieza 9/9, 2026-11-13): «Indicaciones enviadas» en la pestaña Expediente (`ui/client-record-aftercare/`, `ClientRecordAftercare` y `loadClientAftercareForAdmin`), compuesta por `src/app/admin/clients/[id]/expediente/page.tsx` debajo de `RecordView` sin cambios en `clients`. `listForClient` (`db/client-record-aftercare-repository.ts`) filtra por `client_id` porque la administradora elige la clienta por la URL, después de que `loadClientRecordAftercare` valida el uuid; `deliveryStateOf` resume `status` y `last_channel` en el estado del envío. La lectura no se audita: no es el expediente versionado (SEC-006). Pruebas en la evidencia del frontmatter.

**Cierre (2026-11-13).** Los cuatro criterios quedan demostrados con prueba (evidencia en el frontmatter). Lo que falta es de proceso y de configuración, no de código: la captura de «Tus cuidados» (pieza 8/10, se toma tras el merge, cuando CI aplique las migraciones a `lashary-pruebas`) y la plantilla de «Antes de producción», punto 8, sin la cual el envío por WhatsApp no sale (el correo y «Mis citas» no dependen de ella).

## US-NOT-05: recordatorio de re-aplicación de tratamiento

Criterios del backlog:

1. El sistema calcula la fecha estimada de re-aplicación usando el intervalo definido en el catálogo de técnicas y la fecha de la última cita completada.
2. Se envía una notificación cuando se acerca la fecha estimada.
3. La administradora configura con cuántos días de anticipación se envía.
4. No se envía a clientas con morosidad activa ni a quienes ya tienen una cita futura agendada.

Depende de US-NOT-03, US-AGE-08 y US-AGE-12 (todas `terminada`) y, para el criterio 4, de US-MOR-01 (`terminada`
desde el 2026-11-08) — dependencia que no estaba registrada en `docs/process/DEPENDENCIES.md` hasta esta pieza.
Reglas: ARCH-003/004/005 (fronteras entre features; esta historia lee de `catalog`, `scheduling` y `delinquency`
por sus entry points, nunca sus tablas), ARCH-006 (tabla propia con prefijo `notifications_`), DOM-004 (reloj
inyectado), DOM-006 (errores tipados), DOM-009 (texto externalizado), DOM-012 (ninguna consecuencia automática —
aquí, no enviar un mensaje— corre sin la decisión del PO que está más abajo), SEC-002 (test de aislamiento),
PERF-005 (sin queries en loop, igual que `send-due-reminders`), INT-003 (contrato primero) e INT-007.

### Lo que ya existe

- `catalog`: `getTechnique`/`listTechniques` (entry point `@/features/catalog`) ya expone
  `reapplicationIntervalDays: number | null` por técnica (US-AGE-08). Una técnica sin intervalo no entra al
  cálculo.
- `scheduling`: expone `public.scheduling_reapplication_candidates()` (criterio 4, parte scheduling), documentada
  en `src/features/scheduling/SPEC.md` («US-NOT-05 — candidatos de re-aplicación»), no en
  `docs/contracts/scheduling-api.md` (ese contrato es el que consume `clients`, no este). Por clienta y técnica
  con alguna cita `completed`, da la fecha de la más reciente (servicio efectivamente prestado, no el reservado)
  y excluye a quien tenga cualquier cita futura activa, de cualquier técnica. Falta todavía el envoltorio de
  TypeScript (análogo a `reminders-api.ts`) que esta feature consuma desde `scheduling`'s `index.ts`.
- `delinquency`: `delinquency_client_states(p_client_ids uuid[])` (`docs/contracts/delinquency-api.md`, US-MOR-01)
  ya resuelve la parte de morosidad del criterio 4. Solo `active` cuenta como morosidad (DOM-012); `pending_review`
  no bloquea nada.
- `notifications`: el canal (`NotificationChannel`, ADR-0006), `ClientContactPort` y el ciclo `run-reminder-cycle.ts`
  ya existen y están pensados para sumar casos de uso nuevos (como ya hizo US-NOT-08 con las confirmaciones).

### Decisiones del PO (DOM-012, Kenny Rodríguez — líder del proyecto, 2026-11-13)

Registradas en `docs/process/DEPENDENCIES.md`.

- **Cita futura:** cualquier cita futura agendada (de cualquier técnica) descarta el aviso, no solo una de la
  técnica que vence.
- **Reenvío:** una sola vez por ciclo de re-aplicación. No se repite en corridas siguientes del cron; solo una
  nueva cita completada (que recalcula la fecha estimada) vuelve a habilitar el aviso para esa clienta y técnica.
- **Anticipación:** 7 días por defecto, configurable de 1 a 30 por la administradora (mismo patrón que la gracia
  de US-MOR-01 y el plazo de confirmación de US-NOT-08).
- **Alcance de la pieza 1:** solo técnicas sueltas, tal como dice el criterio 1 («intervalo definido en el catálogo
  de técnicas»); el backlog de esta historia no menciona paquetes, así que no entran a este cálculo.

### Lo que ya hay (piezas)

- **Pieza 2/21 — dominio puro** (`domain/reapplication-reminder.ts`): `computeReapplicationDueDate` (criterio 1:
  última cita completada + intervalo del catálogo, con `addDays` nuevo en `shared/date-math.ts`, DOM-004) e
  `isReapplicationDue` (criterios 2 y 3: entra en la ventana de anticipación configurada, y sigue avisando si la
  fecha estimada ya pasó, igual que el plazo de US-NOT-08). `isValidAnticipationDays` valida el rango 1-30.
  Pruebas: `domain/__tests__/reapplication-reminder.test.ts` y `shared/__tests__/date-math.test.ts`.
- **Pieza 3/21 — contrato de `scheduling`** (`scheduling_reapplication_candidates`, migración
  `20261113000000_scheduling_reapplication_candidates_fn.sql`): resuelve en SQL la mitad scheduling del
  criterio 4 (cita futura de cualquier técnica) y da la fecha de la última cita completada por técnica,
  documentado en `src/features/scheduling/SPEC.md`. pgTAP de 10 aserciones en verde contra Supabase local
  (`scheduling_reapplication_candidates.test.sql`), igual que el resto de la suite (91 archivos, 1220 pruebas).
- **Pieza 4/21 — envoltorio de `scheduling`** (`listSchedulingReapplicationCandidates`, exportada desde
  `@/features/scheduling`): el lado `scheduling` del contrato ya tiene su caso de uso público, igual que
  `listSchedulingAppointmentsForReminders` (US-NOT-03). Esta feature todavía no lo importa — eso es la
  siguiente pieza, junto con el contrato equivalente de `delinquency` (`delinquency_client_states`, ya
  existente, sin envoltorio propio de esta feature todavía).
- **Pieza 5/21 — tabla de persistencia** (`notifications_reapplication_reminders`, migración
  `20261114000001_notifications_reapplication_reminders.sql`): a diferencia de `notifications_reminders`
  (US-NOT-03), no es una cola que espere un `send_at` futuro — no hay un evento que dispare la fila de
  antemano, así que cada corrida del cron recalcula la fecha estimada contra `scheduling_reapplication_candidates`
  (pieza 3) y, si ya toca, intenta enviar de inmediato en esa misma corrida. La fila solo deja constancia del
  intento: `status` `'sent'` o `'failed'` (sin `'pending'`/`'claimed'`, que no aplican aquí), con `attempts`
  para reintentar en corridas siguientes hasta el mismo tope que `MAX_REMINDER_ATTEMPTS` de US-NOT-03. La
  restricción `UNIQUE (client_id, technique_id, last_completed_at)` es el «una vez por ciclo» que aprobó el
  líder del proyecto: una nueva cita completada cambia `last_completed_at` y habilita una fila nueva. El CHECK
  `sent_at_matches_status` impide una fila `'sent'` sin `sent_at` o una `'failed'` con `sent_at`. RLS solo
  staff, mismo patrón que `notifications_reminders`. Prueba: pgTAP
  `notifications_reapplication_reminders.test.sql` (12 aserciones: aislamiento SEC-002, el `UNIQUE` del ciclo
  y el `CHECK` en los dos sentidos).

- **Pieza 6/21 — caso de uso `discoverDueReapplications`** (`application/discover-reapplication-reminders.ts`):
  une las tres lecturas (candidatos de `scheduling`, intervalo y nombre de cada técnica de `catalog` en un
  solo `listTechniquesWithInterval` — una consulta acotada al catálogo completo, no una por candidata,
  PERF-005 — y `delinquency_client_states`) con el dominio de la pieza 2. Solo `active` bloquea (DOM-012:
  `pending_review` todavía no tiene consecuencia); una técnica sin intervalo configurado no entra. Todavía
  no escribe en la tabla de la pieza 5 ni envía nada — ese es el puerto `ReapplicationCandidatesPort` +
  `TechniqueReapplicationPort` + `DelinquencyStatesPort` recién declarados en `application/ports.ts`, sin
  adaptador real todavía (la siguiente pieza conecta `scheduling`, `catalog` y `delinquency` de verdad).
  Pruebas: `application/__tests__/discover-reapplication-reminders.test.ts` (8 casos: candidata dentro y
  fuera de la ventana de anticipación, morosidad activa excluye y `pending_review` no, técnica sin
  intervalo no entra, y los tres fallos de lectura como `RepositoryFailure`).

- **Pieza 7/21 — adaptadores reales** (`discoverReapplicationReminders`, exportada desde `index.ts`):
  conecta de verdad los tres puertos de la pieza 6. `db/delinquency-states-gateway.ts` llama
  `delinquency_client_states` por RPC — mismo gateway que ya usa `clients`, repetido aquí porque cada
  feature consume el contrato por su propio puerto (ARCH-004), sin importar el de `clients`. Para el
  catálogo, `catalog` ganó `listTechniquesForReapplication(query?, db?)` (`catalog/reapplication-api.ts`,
  documentado en su SPEC): el cron no tiene cookies de sesión, así que `listTechniques` (de borde,
  `createClient()`) no le serviría — mismo motivo que ya resolvió `reminders-api.ts` de `scheduling`. Una
  sola consulta con `activeOnly: true` trae todas las técnicas activas; una desactivada no genera aviso,
  porque la clienta ya no podría reservarla (supuesto técnico, no una decisión de producto confirmada
  — a revisar si alguna vez importa). La anticipación usa `REAPPLICATION_ANTICIPATION_DAYS_DEFAULT` (7,
  pieza 2) como valor fijo hasta que exista la política configurable (criterio 3, pieza siguiente).
  `discoverReapplicationReminders` todavía no escribe en la tabla de la pieza 5 ni envía nada — solo
  devuelve la lista de quién ya debería recibir el aviso.
  Pruebas: `db/__tests__/delinquency-states-gateway.test.ts` (3 casos). Sin prueba dedicada para el
  cableado de `index.ts` (capa de composición sin lógica propia, igual que `runNotificationsReminderCycle`).
  `npx tsc --noEmit` sin errores.
  **Corrección de la revisión (2026-11-15):** `discoverReapplicationReminders` nunca tuvo quien la
  llamara — ni una pantalla de inspección, ni una prueba, ni otro código. Eliminada en la pieza 19/21.

- **Pieza 8/21 — mensaje y canal** (`domain/reapplication-message.ts`, `REAPPLICATION_MESSAGE_TEXTS`,
  DOM-009): criterio 2, el texto del aviso (técnica y fecha estimada, sin hora — `formatStudioDate`,
  nuevo en `shared/studio-time.ts`, igual que `addDays` en la pieza 2: la aritmética/formato de
  fechas vive en `shared/`). `MessagePurpose` gana `'reapplication_reminder'`; los dos canales
  (`meta-whatsapp-channel.ts`, `resend-email-channel.ts`) ya saben su asunto y su propia variable de
  plantilla (`META_WHATSAPP_REAPPLICATION_TEMPLATE_NAME`, documentada en `.env.example`), mismo patrón
  que `reschedule_outcome` (US-NOT-02) y `appointment_confirmation` (US-NOT-08): sin esa plantilla no
  manda texto libre (Meta lo rechazaría) y cae al correo. Todavía nadie llama a estas funciones desde
  un caso de uso de envío — esa es la siguiente pieza.
  Pruebas: `domain/__tests__/reapplication-message.test.ts`, `shared/__tests__/studio-time.test.ts`
  (`formatStudioDate`) y los casos nuevos de `channels/__tests__/meta-whatsapp-channel.test.ts` y
  `resend-email-channel.test.ts` (plantilla propia, sin plantilla no manda texto libre, asunto y clave
  de idempotencia propios).

- **Pieza 9/21 — repositorio de persistencia** (`db/reapplication-reminder-repository.ts`,
  `reapplicationCycleKey(clientId, techniqueId, lastCompletedAt)` nueva en
  `domain/reapplication-reminder.ts`): la clave identifica el ciclo — cambia solo cuando una nueva
  cita completada mueve `lastCompletedAt`, que es justo lo que debe volver a habilitar el aviso.
  `listRecords` la lee en una sola consulta por lote de clientas, no una por candidata (PERF-005).
  `recordSent`/`recordFailed` hacen `upsert` por la clave `(client_id, technique_id, last_completed_at)`
  — inserta la primera vez, actualiza en los reintentos siguientes. Todavía sin caso de uso que lo
  llame — esa es la siguiente pieza.
  Pruebas: `db/__tests__/reapplication-reminder-repository.test.ts` (6 casos: lectura por lote, forma
  exacta del `upsert` para `sent` y para `failed`, fallos de la base) y el caso nuevo de
  `domain/__tests__/reapplication-reminder.test.ts` para `reapplicationCycleKey`.
- **Pieza 10/21 — caso de uso de envío** (`application/send-due-reapplications.ts`): a diferencia del
  recordatorio de 24h, no hay un evento futuro que espere — recibe directo la lista ya descubierta
  (piezas 6-7) y lo que ya está vencido se intenta mandar en el acto, sin un `claimDuePending` previo
  porque no hay nada "pendiente" guardado de antemano. Antes de intentar, por candidata: si ya hay
  una fila `'sent'` para ese ciclo, se salta (`skipped`); si hay una `'failed'` con
  `attempts >= MAX_REMINDER_ATTEMPTS` (reusa la constante de US-NOT-03, mismo tope: 5), también se
  salta — agotada hasta que una nueva cita completada abra un ciclo nuevo; si no hay fila o es
  `'failed'` con intentos de sobra, intenta. Corrección de la revisión (sin contacto o sin ningún
  canal configurado no son errores de envío, son recuperables sin tocar la base: no escriben fila
  ni gastan un intento, se saltan (`skipped`) y la siguiente corrida los vuelve a intentar en cuanto
  haya contacto o canal — a propósito distinto de `send-due-reminders.ts`/M3, que sí los cuenta
  como intento). Solo un error real de envío (`channelSendFailed`, de uno o los dos canales) cuenta
  hacia `MAX_REMINDER_ATTEMPTS` (`retried` o `exhausted` según el tope). Todavía sin cablear a
  `index.ts` — siguiente pieza.
  Pruebas: `application/__tests__/send-due-reapplications.test.ts` (10 casos: primer envío con
  `attempts: 1`, salto si ya está `sent`, salto si está `failed` y agotado, reintento que suma uno a
  `attempts`, sin contacto se salta sin escribir fila, respaldo por correo, los dos canales sin
  configurar se saltan sin escribir fila, los dos fallando por error real hasta agotar, fallo al leer
  los registros).
- **Pieza 11/21 — cableado** (`runReapplicationReminderCycle`, nueva en `index.ts`): cierra los
  cuatro criterios de US-NOT-05 de punta a punta — descubre con `discoverDueReapplications` y manda
  con `sendDueReapplications` en la misma corrida, con el mismo cliente de sistema.
  `buildReapplicationDiscoveryDeps`/`buildGetContact` quedan compartidas con
  `discoverReapplicationReminders` y `runNotificationsReminderCycle` para no repetir el cableado.
  `npx tsc --noEmit` sin errores; 231 pruebas en verde en `src/features/notifications`, el resto
  saltado por el mismo problema de entorno preexistente. Sin prueba dedicada para el cableado de
  `index.ts` (capa de composición sin lógica propia).

- **Pieza 12/21 — tabla de configuración** (`notifications_reapplication_settings`, migración
  `20261114000002_notifications_reapplication_settings.sql`): criterio 3, de a cuántos días de
  anticipación avisar. Fila única, 7 por defecto, rango 1-30 (decisión del líder del proyecto,
  2026-11-13), mismo patrón que `delinquency_settings` (US-MOR-01) y `scheduling_confirmation_policy`
  (US-NOT-08): nadie la cambia directo, ni la administradora — solo la función de la siguiente
  pieza, para que cada cambio deje su evento en la bitácora. Todavía nadie la lee: el ciclo sigue
  usando `REAPPLICATION_ANTICIPATION_DAYS_DEFAULT` del dominio hasta la pieza 14.
  Prueba: pgTAP `notifications_reapplication_settings.test.sql` (7 aserciones: valor por defecto,
  nadie cambia directo —ni admin ni clienta—, aislamiento SEC-002, anon sin permiso, rango 1-30
  aplicado aunque se escriba como dueño). Suite completa corrida de nuevo: 93 archivos, 1239
  pruebas, todo en verde.

- **Pieza 13/21 — función de cambio** (`notifications_set_reapplication_anticipation_days`, migración
  `20261114000003_notifications_set_reapplication_anticipation_days_fn.sql`): mismo patrón que
  `delinquency_set_grace_days` (US-MOR-01) — solo admin, de 1 a 30, deja su evento
  `notifications.settings.reapplication_anticipation_days_changed` en la bitácora con el valor
  anterior y el nuevo, y poner el mismo valor no deja evento. `SECURITY DEFINER` porque la tabla no
  tiene escritura directa. Todavía sin envoltorio de TypeScript ni pantalla — siguiente pieza.
  Prueba: pgTAP `notifications_set_reapplication_anticipation_days.test.sql` (12 aserciones: cambia
  y devuelve el valor, bitácora con quién/antes/después, mismo valor no deja evento, rango 1-30,
  clienta y anon denegados). Suite completa: 94 archivos, 1251 pruebas, todo en verde.

- **Pieza 14/21 — envoltorio de TypeScript y ciclo configurado** (`db/reapplication-settings-repository.ts`,
  `application/reapplication-settings.ts`, `InvalidAnticipationDays` nuevo en `domain/errors.ts`):
  mismo patrón que `delinquency`'s `settings-repository.ts`/`grace-days.ts` (US-MOR-01) — un valor
  fuera de rango ni siquiera llega a la base, se rechaza en `changeAnticipationDays` reusando
  `isValidAnticipationDays` del dominio (pieza 2); la base lo vuelve a exigir igual.
  `buildReapplicationDiscoveryDeps` ahora lee `notifications_reapplication_settings` (pieza 12) antes
  de armar el ciclo: si la lectura falla, sigue con `REAPPLICATION_ANTICIPATION_DAYS_DEFAULT` en vez
  de frenar toda la corrida, con el fallo avisado por consola. Con esto el criterio 3 queda completo
  del lado de los datos y la lógica; falta la pantalla.
  Pruebas: `application/__tests__/reapplication-settings.test.ts` (8 casos) y
  `db/__tests__/reapplication-settings-repository.test.ts` (8 casos: lectura, error de forma, llamada
  a la función con los días, traducción del rechazo por rango, cualquier otro error como
  `RepositoryFailure`). `npx tsc --noEmit` sin errores; 254 pruebas en verde en
  `src/features/notifications`, el resto saltado por el mismo problema de entorno preexistente.

- **Pieza 15/21 — acción y servicio** (`ui/reapplication-settings/{constants,types,validation,actions,services}`):
  decisión de dónde vive la pantalla — pestaña nueva en `/admin/citas` (como las demás políticas de
  la sección), no una sección "Notificaciones" nueva en la navegación principal ni dentro de la
  bandeja existente. `setAnticipationDaysAction` exige sesión de administradora, valida con zod
  (mismo rango que el dominio) y refresca `/admin/citas/re-aplicacion` al guardar; `reapplicationSettingsService.load`
  envuelve `loadAnticipationDays` con la sesión y el cliente del borde. Sin componentes todavía —
  siguiente pieza.
  Pruebas: `__tests__/reapplication-settings-actions.test.ts` (10 casos, mismo patrón que
  `review-actions.test.ts` de `delinquency`). `npx tsc --noEmit` sin errores.
  **Corrección:** `label` e `invalid` repetían «1 a 30» como texto suelto, duplicando el rango que
  ya vive en `REAPPLICATION_ANTICIPATION_DAYS_MIN`/`MAX` (dominio, pieza 2); ahora son función de
  esos dos parámetros, así que el texto no puede desalinearse del rango real.
- **Pieza 16/21 — componentes** (`ui/reapplication-settings/components/`): el formulario, mismo
  patrón liviano que `GraceDaysForm` de `delinquency` (un solo campo, sin `useFormState`):
  `AnticipationDaysForm` llama directo a `setAnticipationDaysAction` con `useTransition`.
  `ReapplicationSettingsPage` → `ReapplicationSettingsView` (estados `ready`/`error`, UI-003) →
  `ReapplicationSettingsLoading` para el `loading.tsx` de la ruta. Todavía sin ruta ni pestaña que
  la muestre — siguiente y última pieza.
  Pruebas: `AnticipationDaysForm.test.tsx` (5 casos: guarda y avisa con `role=status`, error en la
  misma región viva, deshabilita mientras guarda, sin enviar nada no hay aviso, campo vacío manda
  `NaN` sin romper) y `ReapplicationSettingsView.test.tsx` (2 casos: listo muestra el formulario con
  el valor vigente, error avisa con `role=alert` y ofrece reintentar sin formulario). `npx tsc
  --noEmit` sin errores.
  **Corrección:** el formulario llama ahora a `copy.label(MIN, MAX)` (función, pieza 15) en vez de
  un texto fijo.

- **Pieza 17/21 — ruta y pestaña** (`src/app/admin/citas/re-aplicacion/`, `client.ts` nuevo en
  `notifications` — mismo propósito que el de `scheduling`: `loading.tsx`/`error.tsx` no cargan todo
  `index.ts`, solo lo mínimo client-safe): `page.tsx`, `loading.tsx` y `error.tsx` (boundary de
  Next.js para una excepción real, distinto del estado `'error'` manejado de la vista) siguen el
  mismo patrón que `/admin/citas/confirmacion`. `CitasTabs` gana la pestaña «Re-aplicación»
  (`CITAS_SECTION.tabs.reapplication`, `CITAS_ROUTES.reapplication`). Con esto el criterio 3 de
  US-NOT-05 queda visible para la administradora.
  Pruebas: `layout.test.tsx` de `/admin/citas` extendido con la pestaña nueva. `npx tsc --noEmit`
  sin errores; 274 pruebas en verde entre `src/app/admin/citas` y `src/features/notifications`, el
  resto saltado por el mismo problema de entorno preexistente.
- **Corrección de la revisión (2026-11-15):** esta sección decía que conectar
  `runReapplicationReminderCycle` al disparador del cron era checklist de activación, igual que la
  plantilla de WhatsApp o el dominio de Resend de US-NOT-03/07/08. El reviewer lo marcó mal: esas
  son configuración externa; cablear el handler que ya existe en el repo es código, y sin ese
  cableado el criterio 2 (se manda el aviso cerca de la fecha) no se cumplía en ningún entorno real.
  Corregido en la pieza 18/18.
- **Pieza 18/21 — llamador del ciclo** (`http/cron-handler.ts`): `receiveReminderCronRequest` corre
  `runNotificationsReminderCycle` y `runReapplicationReminderCycle` en paralelo (`Promise.all`), cada
  uno con su propio `try/catch` (`runCycle`) para que un error o una excepción de uno no tumbe al
  otro — la respuesta siempre trae los dos resúmenes, bajo `reminders` y `reapplications`. El estado
  HTTP es 200 solo si los dos salieron bien; 503 si cualquiera falló (error del dominio o excepción
  inesperada, igual que antes). Con esto los cuatro criterios de US-NOT-05 están completos de punta
  a punta, incluido el que faltaba.
  Pruebas: `http/__tests__/cron-handler.test.ts` (7 casos, nuevo — no existía prueba de este handler
  ni siquiera para `runNotificationsReminderCycle`: sin secreto, secreto equivocado, los dos ciclos
  bien, falla uno y el otro corre igual, falla el otro, excepción inesperada en uno, fallan los dos).
  **Nota de la revisión:** `runCycle` no normaliza ni reemplaza el error del dominio — `result.error`
  viaja tal cual al cuerpo de la respuesta (`NotificationsCycleError` es siempre un literal string,
  así que no hay nada que tapar). Solo la excepción inesperada se colapsa a `'unexpected-error'` en
  el cuerpo (no en el log, donde sí queda el mensaje real), igual que ya hacía el cron de
  `delinquency`: no conviene exponerla tal cual en una respuesta HTTP.

- **Pieza 19/21 — corrección de la revisión: tope de 30 días, un solo aviso por clienta** (`domain/reapplication-reminder.ts`,
  `domain/reapplication-message.ts`, `application/discover-reapplication-reminders.ts`,
  `application/send-due-reapplications.ts`): decisión del PO del 2026-11-15 (Kenny Rodríguez,
  `docs/process/DEPENDENCIES.md`). `isReapplicationExpired` (nueva, `REAPPLICATION_OVERDUE_CUTOFF_DAYS`
  = 30) descarta un candidato cuya fecha estimada ya pasó hace más de 30 días — ya no tiene sentido
  avisar de algo tan viejo. `buildReapplicationMessage`/`buildReapplicationTemplateVariables` reciben
  `now` y cambian el texto de entrada según si la fecha estimada todavía viene (`introUpcoming`) o ya
  pasó (`introOverdue`). Si una clienta tiene más de una técnica vencida en la misma corrida,
  `discoverDueReapplications` agrupa por `clientId` y deja solo la de fecha estimada más vieja — nunca
  manda dos avisos de re-aplicación a la misma clienta en un mismo ciclo. `sendDueReapplications` ya
  no repite el bloque de envío por canal primario y de respaldo (antes duplicado): un solo bucle sobre
  los dos canales, que también simplificó la condición de «ambos sin configurar». `listRecords` se
  troza en lotes de 100 clientas (`LIST_RECORDS_BATCH_SIZE`) en vez de una sola consulta con todos los
  ids — la función de candidatas no se acotó en SQL (decisión explícita: no conoce el intervalo por
  técnica, que vive en `catalog` sin tope documentado; acotar ahí exigiría o un JOIN cruzado nuevo con
  `catalog_techniques` o un número inventado — el filtro de 30 días vive solo en TypeScript, que ya
  tiene el intervalo por técnica resuelto).
  Pruebas: `domain/__tests__/reapplication-reminder.test.ts` (+3 casos de `isReapplicationExpired`),
  `domain/__tests__/reapplication-message.test.ts` (+2, texto según venza o no), `application/__tests__/discover-reapplication-reminders.test.ts`
  (+2, vencida hace más de 30 días y una sola de dos técnicas vencidas), `application/__tests__/send-due-reapplications.test.ts`
  (+1, lotes de 100; los dos casos de «sin contacto»/«sin canal» de la pieza 10 se mantienen en verde).

- **Pieza 20/21 — corrección de la revisión: abortar si falla la anticipación, borrar código muerto**
  (`index.ts`): `buildReapplicationDiscoveryDeps` ahora devuelve `Result<..., RepositoryFailure>` — si
  no se puede leer la anticipación configurada, la corrida aborta con el error en vez de usar 7 en
  silencio (antes de esta corrección, un fallo de lectura pasaba inadvertido). `runReapplicationReminderCycle`
  revisa ese resultado antes de descubrir o mandar nada, y cierra la sesión igual en cualquier caso.
  `discoverReapplicationReminders` (la pieza 7) se elimina: nadie la llamaba, ni una pantalla ni una
  prueba — no era checklist de activación, era código sin dueño.
  Pruebas nuevas: `__tests__/reapplication-cycle.test.ts` (8 casos — `buildReapplicationDiscoveryDeps`:
  anticipación configurada, aborta si falla leerla, delega `listCandidates`; `runReapplicationReminderCycle`:
  sin cuenta de sistema, cuenta que no entra, aborta si falla la anticipación sin descubrir ni mandar
  nada, caso feliz completo, aborta si falla descubrir). No existía ninguna prueba de esta capa de
  composición hasta esta pieza.

- **Pieza 21/21 — corrección de la revisión: estilo y documentación** (sin cambio de comportamiento):
  se quitan los comentarios `//` que quedaban en archivos de la pila (`catalog/index.ts`,
  `catalog/reapplication-api.ts`, `application/ports.ts`, `application/reapplication-settings.ts`,
  `channels/meta-whatsapp-channel.ts`, `db/delinquency-states-gateway.ts`, `shared/studio-time.ts`,
  `ui/reapplication-settings/components/FeedbackMessage/FeedbackMessage.tsx`,
  `http/__tests__/cron-handler.test.ts`); «Intentá de nuevo» pasa a «Intenta de nuevo» en
  `reapplication-settings-strings.ts` (tuteo, no voseo). Los imports de `ui/reapplication-settings/`
  por `@/features/notifications/...` (en vez de ruta relativa) se revisaron y se dejan como están:
  `.oxlintrc.json` (`no-restricted-imports`) exige el alias `@/` al subir 3 o más niveles y no hay
  alias más corto por feature — pasarlos a relativo (`../../../...`) los pone en rojo en `oxlint`, así
  que la forma actual es la correcta según la convención de este repo, no algo por corregir. Decisiones
  de arranque confirmadas y ampliadas por Kenny Rodríguez el 2026-11-15, y
  el riesgo de WhatsApp duplicado aceptado como deuda: ver `docs/process/DEPENDENCIES.md` y `deuda` en
  el frontmatter de este SPEC.

### Qué no hace todavía

Falta el disparador en producción (Vercel Cron o GitHub Actions llamando a
`/api/cron/notifications-reminders` con el `CRON_SECRET` real) y la cuenta de sistema del cron en
producción — eso sí es checklist de activación externa, no código (mismo criterio que cerró
US-NOT-03/07/08). También falta lo ya señalado para el canal compartido: plantilla de WhatsApp
aprobada por Meta, número de WhatsApp Business real y dominio verificado en Resend.

## US-NOT-04: recordatorio de pago pendiente

Criterios del backlog:

1. El sistema envía un recordatorio automático a los clientes con morosidad activa con la frecuencia que configure la administradora.
2. El recordatorio incluye el monto adeudado y un enlace para regularizar.
3. El recordatorio deja de enviarse automáticamente una vez saldada la morosidad.
4. Un cliente cuya morosidad está bajo excepción manual no recibe recordatorios.

Depende de US-NOT-03 (el canal) y de US-MOR-02, ambas `terminada`. Reglas: ARCH-003/004/005 (lee `delinquency` y
`payments` por sus entry points y contratos, nunca sus tablas), ARCH-006 (tablas propias con prefijo `notifications_`),
DOM-012 (solo la morosidad `active` tiene consecuencias; `pending_review` y `dismissed` no reciben recordatorio),
DOM-005 (el ledger solo se lee), SEC-001/002 (RLS y aislamiento), PERF-002 (nada de consultas una por una),
UI-003/004 (la pantalla de la frecuencia), INT-002/003/008/009/010 y EST-006/007.

### Qué se puede demostrar hoy y qué no

| Criterio | Estado | Con qué |
|---|---|---|
| 1 | Demostrable | Las clientas salen de `delinquency_list_active` (contrato en `docs/contracts/delinquency-api.md`, ya en `main`); la frecuencia va en una tabla propia con su pantalla; el envío usa el canal de US-NOT-03 |
| 2, monto | Demostrable | El saldo de hoy sale del ledger por `payments_appointment_balances` / `payments_client_balance` (contrato de `payments`), no del `pending` que guardó la detección |
| 2, enlace para regularizar | Demostrable | `CLIENT_PORTAL_ROUTES.cuenta` (`/portal/cuenta`) ya está en `main`; lo que la clienta encuentra ahí, el estado de cuenta y el comprobante, lo construye US-MOR-03 (pila #900 a #925) |
| 3 | Demostrable | El saldo se lee en el momento del envío, no del estado del caso. Se prueba sembrando un asiento de pago en el ledger, como hicieron las pruebas de US-MOR-02 |
| 4 | Demostrable | `delinquency_list_active` y `delinquency_booking_block` solo devuelven casos `active`; US-MOR-05 (ya en `main`) agrega `lifted` y `forgiven`, que quedan fuera sin código extra |

### Alcance

Esta historia cierra con los cuatro criterios demostrados. US-MOR-03 y US-MOR-05 ya están en `main` (2026-11-22), así que no se traslada nada a otra historia. Orden de merge cumplido: US-MOR-03, US-MOR-05 y esta, para que el enlace del recordatorio lleve a la pantalla de regularizar.

### Criterio y prueba

| Criterio | Estado | Prueba que lo demuestra |
|---|---|---|
| 1: recordatorio automático a morosidad activa, con la frecuencia que configura la administradora | Demostrado | `domain/__tests__/payment-reminder.test.ts` (cuándo toca y el rango), `application/__tests__/discover-due-payment-reminders.test.ts` (no repite antes de la frecuencia, repite al cumplirse, 1 día contra 7), `application/__tests__/send-due-payment-reminders.test.ts` (canal primario y respaldo, reintento si no salió), `db/__tests__/delinquent-clients-gateway.test.ts` (solo activas, todas las páginas), `db/__tests__/payment-reminder-repository.test.ts` (último envío y cuenta), `__tests__/payment-reminder-cycle.test.ts` y `http/__tests__/cron-handler.test.ts` (el cron lo corre sin tumbar a los otros ciclos), `application/__tests__/payment-reminder-settings.test.ts`, `db/__tests__/payment-reminder-settings-repository.test.ts` y `ui/payment-reminder-settings/__tests__/` (la administradora lo configura), y pgTAP `notifications_payment_reminder_settings.test.sql`, `notifications_set_payment_reminder_frequency_days.test.sql` y `notifications_payment_reminders.test.sql`. Probado a mano en el navegador contra Supabase local (2026-11-18): carga con 7, guarda 14 y deja el evento |
| 2: incluye el monto adeudado | Demostrado | `domain/__tests__/payment-reminder-message.test.ts`, `application/__tests__/send-due-payment-reminders.test.ts` y `db/__tests__/client-owed-amount-gateway.test.ts` (saldo de hoy, no el de la detección) |
| 2: …y un enlace para regularizar | Demostrado | `domain/__tests__/payment-reminder-message.test.ts` y `application/__tests__/send-due-payment-reminders.test.ts` (el mensaje y la variable de la plantilla llevan la URL) y `__tests__/payment-reminder-cycle.test.ts` (arma `NEXT_PUBLIC_SITE_URL` más `/portal/cuenta`; sin URL válida no manda nada) |
| 3: deja de enviarse al saldarse | Demostrado | `application/__tests__/discover-due-payment-reminders.test.ts` (saldo cero) y `db/__tests__/client-owed-amount-gateway.test.ts` (sin filas) |
| 4: la excepción manual no recibe recordatorios | Demostrado | pgTAP `notifications_payment_reminder_exceptions.test.sql`: una morosidad levantada o condonada no aparece en `delinquency_list_active` ni tiene saldo en `delinquency_booking_block`; una condonación parcial deja el caso activo y el recordatorio pide el saldo de hoy |

### Lo construido

- **Frecuencia (piezas 2 y 3):** tabla `notifications_payment_reminder_settings` (una fila, `frequency_days` de 1 a 30,
  7 por defecto, sin escritura directa) y `notifications_set_payment_reminder_frequency_days`, la única vía para
  cambiarla: solo admin, deja `notifications.settings.payment_reminder_frequency_days_changed` en la bitácora con el
  valor anterior y el nuevo. pgTAP `notifications_payment_reminder_settings.test.sql` y
  `notifications_set_payment_reminder_frequency_days.test.sql`.
- **Dominio (pieza 4):** `domain/payment-reminder.ts` (`isValidPaymentReminderFrequencyDays` e `isPaymentReminderDue`:
  sin envío anterior toca ya; con uno, toca al cumplirse la frecuencia) y `domain/payment-reminder-message.ts`
  (mensaje con el monto adeudado, y, desde la pieza 16, el enlace a regularizar). Puro, sin base ni canal.

- **Último envío (pieza 5):** tabla `notifications_payment_reminders`, una fila por clienta (`last_sent_at`,
  `last_amount`, `last_channel`, `send_count`). Solo guarda un envío que el canal confirmó: un intento fallido no
  escribe aquí: la siguiente corrida lo reintenta sin esperar la frecuencia, hasta el tope de intentos del día (pieza 15). Que el recordatorio pare al saldarse
  (criterio 3) no depende de esta tabla: depende del saldo del ledger. Staff lee y escribe (el cron entra como
  staff, SEC-003); la clienta y anon, nada. pgTAP `notifications_payment_reminders.test.sql`.

- **Descubrimiento (pieza 6):** `application/discover-due-payment-reminders.ts` toma las clientas con morosidad `active` (`delinquency_list_active`, paginada de a 100 por `db/delinquent-clients-gateway.ts`), descarta a quien todavía no le toca por la frecuencia y, solo a las que le tocan, pide el saldo de hoy con `delinquency_booking_block` (`db/client-owed-amount-gateway.ts`): sin filas la morosidad ya se saldó y no se envía (criterio 3). Es una llamada por clienta a la que ya le toca, no por todas; `delinquency_list_active_cases` de US-MOR-05, ya en `main`, permite pasar a una sola llamada por lote a `payments_appointment_balances`.

- **Registro del último envío (pieza 7):** `db/payment-reminder-repository.ts` lee la fecha del último recordatorio de cada clienta (en lotes de 100) y escribe el envío en `notifications_payment_reminders`, sumando uno a la cuenta de envíos de esa clienta. Solo se escribe un envío que un canal confirmó; el envío por el canal llega en la pieza 8.

- **Envío (pieza 8):** `application/send-due-payment-reminders.ts` manda el mensaje por el canal primario y, si falla, por el correo de respaldo (ADR-0006), con el propósito nuevo `payment_reminder`. Si no hay canal configurado no registra nada. Si fallan los dos, lo registra y la siguiente corrida lo reintenta hasta el tope de intentos del día (pieza 15). La clave del envío es la clienta y el día, así que una corrida repetida el mismo día no duplica el correo. WhatsApp usa `META_WHATSAPP_PAYMENT_TEMPLATE_NAME` (una variable: el monto), documentada en `.env.example`.

- **Cableado (pieza 9):** `runPaymentReminderCycle` (en `index.ts`) entra con la cuenta de sistema, lee la frecuencia (`db/payment-reminder-settings-repository.ts`; si falla, aborta en vez de usar el valor por defecto), descubre y envía, y cierra la sesión. `receiveReminderCronRequest` lo corre junto a los otros dos ciclos de `/api/cron/notifications-reminders`, cada uno con su propio `try/catch`: si uno falla, los otros corren igual y la respuesta es 503; la respuesta trae `paymentReminders`. Como los tres corren en paralelo sin coordinarse, una clienta puede recibir el recordatorio de pago y otro aviso en la misma corrida (la misma deuda ya aceptada para el recordatorio de 24h y la re-aplicación).

- **Cambiar la frecuencia (pieza 10):** `application/payment-reminder-settings.ts` (`loadPaymentReminderFrequencyDays` y `changePaymentReminderFrequencyDays`, que valida el rango antes de llamar a la base), `setFrequencyDays` en `db/payment-reminder-settings-repository.ts` (llama a `notifications_set_payment_reminder_frequency_days`; el rechazo de rango vuelve como `invalidPaymentReminderFrequencyDays`) y, en `ui/payment-reminder-settings/`, la acción de servidor `setFrequencyDaysAction` (exige sesión de administradora y refresca `/admin/citas/recordatorio-pago`), el servicio de lectura, el esquema y los textos. La pantalla llega en la pieza 11.

- **Pantalla (pieza 11):** `/admin/citas/recordatorio-pago`, pestaña «Recordatorio de pago» en Citas. Un campo numérico de 1 a 30 y «Guardar»; la lógica del formulario vive en `hooks/use-frequency-days-form.ts` y el componente solo dibuja. Estados: carga (`loading.tsx`), error de carga con «Reintentar» (`role=alert`) y aviso de guardado en región viva (`role=status`). Reusa `FeedbackMessage` de la pantalla de re-aplicación. Como esa pantalla, anida su `<main>` dentro del `<main>` del panel y a 375 px el menú lateral deja poco ancho al contenido: ambos ya existen en el panel y no se tocan aquí.

- **Un error de saldo no frena a las demás (pieza 13, auditoría M1):** `discoverDuePaymentReminders` devuelve `{ due, errored }`: si pedir el saldo de una clienta falla, lo registra con `logError`, la cuenta en `errored` y sigue con las siguientes; `runPaymentReminderCycle` suma esos errores al `errored` del resumen. Antes un solo fallo detenía el descubrimiento de todas las que venían detrás, en cada corrida.

- **Fallos del recordatorio (pieza 14, auditoría M2):** tabla `notifications_payment_reminder_failures`, una fila por clienta (`attempt_day`, `attempts`, `last_error` de hasta 501 caracteres: los 500 de `sanitizeProviderError` más el «…» de truncado, `last_failed_at`), migración `20261119000003`. Es la base del tope de intentos por clienta y día y del registro del error del canal; la usa la pieza 15. Staff lee, escribe y borra (el cron entra como staff, SEC-003); la clienta y anon, nada. pgTAP `notifications_payment_reminder_failures.test.sql`. Con ella la pila de US-NOT-04 trae 4 migraciones: `20261119000000` a `20261119000003`.

- **Tope de intentos y registro del fallo (pieza 15, auditoría M2):** `application/send-due-payment-reminders.ts` lee con `attemptsOn` los intentos fallidos de hoy de cada clienta por enviar (`db/payment-reminder-failure-repository.ts`, en lotes de 100) y, si ya llegó a `MAX_REMINDER_ATTEMPTS` (5, el mismo tope de los otros ciclos), no vuelve a intentar hasta el día siguiente y la cuenta en `exhausted` del resumen. Cuando fallan los dos canales, `recordFailure` guarda el intento y el error de cada canal (`sanitizeProviderError`: sin teléfono y con tope de largo) y lo deja en el log; si el fallo no se puede guardar, cuenta `errored`. El día es el de la fecha en UTC (`paymentReminderDay`) y el conteo vuelve a uno al cambiar de día. Un envío que sale bien no borra la fila: a esa clienta no le vuelve a tocar hasta cumplirse la frecuencia, así que el conteo ya es de otro día. Si no se pueden leer los intentos de hoy, la corrida devuelve el fallo y no manda nada. Pruebas: `application/__tests__/send-due-payment-reminders.test.ts` y `db/__tests__/payment-reminder-failure-repository.test.ts`.

- **Enlace para regularizar (pieza 16, criterio 2):** el mensaje lleva «Regulariza tu saldo desde tu estado de cuenta» y la URL de `/portal/cuenta`, que `runPaymentReminderCycle` arma con `NEXT_PUBLIC_SITE_URL` y `CLIENT_PORTAL_ROUTES.cuenta` de `auth`, igual que los enlaces a «Mis citas». La plantilla de WhatsApp pasa a dos variables: el monto y la URL. Sin una URL absoluta válida el ciclo no manda nada, lo deja en el log y devuelve el fallo, como los avisos de confirmación y de indicaciones. La ruta ya está en `main`; el estado de cuenta y el formulario del comprobante son de US-MOR-03.

- **Prueba de la excepción manual (pieza 17, criterio 4):** pgTAP `notifications_payment_reminder_exceptions.test.sql`, con los estados que trae US-MOR-05: una morosidad levantada (`delinquency_lift_case`) o condonada del todo (`delinquency_forgive_case`) no aparece en `delinquency_list_active`, de donde sale la lista del recordatorio, ni tiene saldo en `delinquency_booking_block`, de donde sale el monto; una condonación parcial deja el caso `active` y el recordatorio pide el saldo de hoy, no el original; sin excepción sigue pidiendo todo. No hay código nuevo: el código ya leía solo casos `active`. US-MOR-05 probaba que `booking_block` excluye esos estados, pero no `delinquency_list_active`.

### Decisiones propuestas, sin aprobar

- **Frecuencia:** cada cuántos días se repite el recordatorio mientras haya saldo, de 1 a 30 y 7 por defecto, el mismo
  patrón y rango que la anticipación de US-NOT-05 y la gracia de US-MOR-01. El rango y el valor por defecto son una
  propuesta: la historia no los fija.
- **Un solo aviso por clienta y corrida**, aunque tenga varias citas con saldo, igual que US-NOT-05 (pieza 19).
- **Canal:** el de US-NOT-03 (primario y respaldo, ADR-0006). El envío real depende de «Antes de producción».

## Qué no hace todavía

- No hay UI: ninguna pantalla muestra el registro de envíos ni deja cambiar el canal o reintentar a
  mano. No lo pide ningún criterio de US-NOT-03 ni de US-NOT-07.
- US-NOT-06 reusa el canal pero no está construida; US-NOT-04 está en curso (su sección); US-NOT-05 ya está terminada (su sección). US-NOT-02 y
  US-NOT-08 están construidas y tienen pendiente lo de su sección.

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
  en tandas de `CLAIM_BATCH_SIZE` (`db/claim-limits.ts`) en vez de reclamar todo de una vez, y vuelve a reclamar lo
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
- **El lote, el TTL y la duración de la ruta van atados:** `CLAIM_BATCH_SIZE`, `CLAIM_TTL_MINUTES` y
  `CYCLE_MAX_DURATION_SECONDS` viven en `db/claim-limits.ts`, calculados a partir de
  `CHANNEL_SEND_TIMEOUT_MS`; el detalle está en «Tiempo del ciclo» de la sección de US-NOT-02.

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
5. **Disparo automático en producción.** No existe `vercel.json` ni un workflow que llame a la ruta:
   el plan Hobby de Vercel solo permite cron jobs una vez al día, así que el disparo cada 15 minutos
   se resuelve con un workflow de GitHub Actions que haga `POST` con el `Bearer CRON_SECRET`
   (decisión del líder, 2026-10-21). El workflow lo aplica un admin; dueño y fecha en «Activación del
   cron de recordatorios» de `docs/process/DEPENDENCIES.md`. Mientras no corra, tampoco vencen solos
   los reagendados sin decisión de US-AGE-10.
6. **Cuenta de staff del cron en producción — deliberadamente no creada.** Decisión del líder
   (2026-10-21): sin número de WhatsApp ni dominio de email reales, cualquier recordatorio que el
   cron intentara mandar en producción fallaría en los dos canales y, tras `MAX_REMINDER_ATTEMPTS`
   (5) intentos, quedaría en `failed` sin llegarle nunca a la clienta. Se creó la cuenta equivalente
   solo en `lashary-pruebas` (base de pruebas) para validar el código; la de producción se crea
   cuando los puntos 1 a 3 estén resueltos.
7. **Plantilla del aviso de cambio de horario (US-NOT-02, ítem 13).** Con un número de WhatsApp
   Business real hace falta una segunda plantilla aprobada, con 3 variables (servicio, horario pedido y
   horario que conserva) y un texto que sirva para el rechazo y para el vencimiento; su nombre va en
   `META_WHATSAPP_RESCHEDULE_OUTCOME_TEMPLATE_NAME` (`.env.example`). Sin ella el aviso sale por correo, y
   sin correo queda `failed`; la nota en «Mis citas» no depende de ningún canal.
8. **Plantilla de las indicaciones de cuidado (US-CLI-06).** Con un número de WhatsApp Business real hace
   falta otra plantilla aprobada, con 3 variables (servicio, cuidados y nota en una línea separados por
   `TEMPLATE_LINE_SEPARATOR`, y enlace a «Mis citas»); su nombre va en `META_WHATSAPP_AFTERCARE_TEMPLATE_NAME`
   (`.env.example`). Sin ella, o si Meta rechaza un texto demasiado largo, las indicaciones salen por correo
   con el texto completo, y sin correo queda `failed`; lo que ve la clienta en «Mis citas» no depende del canal.
   Hay que probar con textos reales que Meta acepte la línea aplanada; si no, se pasa a mandar también el
   correo siempre (opción B de la auditoría del 2026-11-15).

9. **Plantilla del recordatorio de pago (US-NOT-04).** Con un número de WhatsApp Business real hace falta otra plantilla aprobada, con 2 variables (el monto adeudado y el enlace a regularizar, en ese orden); su nombre va en `META_WHATSAPP_PAYMENT_TEMPLATE_NAME` (`.env.example`). Sin ella el recordatorio sale por correo, y sin correo no se registra ni se envía; se reintenta en la siguiente corrida, hasta el tope de intentos del día. El texto del mensaje (`domain/payment-reminder-message.ts`) es provisional hasta que la dueña decida el real, igual que el de los otros avisos.

## Cierre (2026-10-27)

El líder del proyecto confirmó que US-NOT-03 pasa a `terminada` en el PR de cierre #577: lo
pendiente en «Antes de producción» es configuración externa y decisiones de negocio, no código,
así que ya no justifica dejar la historia `en_progreso` y bloquear en falso a quienes dependen de
ella (US-NOT-04, 05, 06, 07, 08 y US-CLI-06, docs/process/DEPENDENCIES.md). La etiqueta
`excepcion-proceso` que llevaba el PR de cierre se quitó: no hay criterio diferido que la
justifique (EST-007), los cuatro criterios de aceptación quedan demostrados con prueba (evidencia
en el frontmatter de esta historia).

- Aviso de comprobante enviado (US-MOR-03; migración `20261117090000_delinquency_regularization_notice.sql`): el tipo `regularization_submitted` en `notifications_admin_inbox`, con lo que declaró la clienta en `declared_amount` y la cita de la morosidad, sin servicio ni hora. Lo registra `notifications_record_regularization_submitted` (sin `EXECUTE` para nadie con sesión), que llama el trigger de `delinquency` al llegar una solicitud; uno por solicitud. En la bandeja dice «{clienta} envió un comprobante de pago», «Declara ₡X; verifique el comprobante» y lleva a «Revisar comprobantes» (`/admin/morosidades`). Pruebas: pgTAP `delinquency_regularization_notice.test.sql`, `db/__tests__/inbox-repository.test.ts` y `ui/inbox/__tests__/notice-lines.test.ts`.

## Contrato público (`index.ts`, ARCH-003)

- `runNotificationsReminderCycle` — corre un ciclo completo (descubrir → reconciliar → enviar).
  Consumidor: `receiveReminderCronRequest`.
- `receiveReminderCronRequest` — handler de la ruta de cron. Consumidor:
  `src/app/api/cron/notifications-reminders/route.ts`.
- `loadAdminInbox`, `AdminInbox`, `markNoticeAction` y sus tipos (US-NOT-01). Consumidor:
  `src/app/admin/layout.tsx`.
- `loadMyClientNotices`, `ClientNotices` y `ClientNoticesResult` (US-NOT-02). Consumidor:
  `src/app/portal/citas/mis-citas/page.tsx`.
- `loadMyAftercare`, `MyAftercare` y `MyAftercareResult` (US-CLI-06). Consumidor:
  `src/app/portal/citas/mis-citas/page.tsx`.
- `loadClientAftercareForAdmin`, `ClientRecordAftercare` y `ClientRecordAftercareResult` (US-CLI-06). Consumidor: `src/app/admin/clients/[id]/expediente/page.tsx`.
- `AFTERCARE_NOTE_MAX_LENGTH` (US-CLI-06). Consumidor: la prueba
  `src/features/scheduling/ui/daily-agenda/__tests__/close-aftercare-note-limit.test.ts`; el código de
  `scheduling` no lo importa (ver «Hecho», pieza 7/9).
- Dominio y aplicación son superficie interna; ninguna otra feature los consume.

## Decisiones

- US-NOT-01, 2026-10-29: el aviso nace al reservar la clienta, no al aprobar (la historia dice
  «cuando un cliente agende»). Acordado por el equipo, comunicado por José Loría el 2026-10-29.
- US-NOT-01, 2026-10-29: la historia se cierra en la pieza 5 de 5, la última con código; no se abre
  una pieza aparte solo para el cierre.

- ADR-0006 (canal de notificaciones): WhatsApp directo contra la Graph API de Meta (sin Twilio,
  decisión del PO el 2026-10-21: lo exige quien pide el proyecto), Resend como respaldo por email
  (proveedor elegido por el PO el 2026-10-20).

- US-CLI-06, 2026-11-13, decisiones de José Loría al planear la historia:
  - La nota «para esa clienta» (criterio 3) se escribe en el diálogo de cierre y vale para esa cita.
    Se descartó un texto fijo por clienta (no sirve para lo que pasó en una cita) y un segundo envío
    desde la ficha (dos mensajes por cita, y el cierre saldría sin la nota).
  - «Visible en la vista de citas del cliente» (criterio 4) se cumple en «Mis citas», que ya existe y ya
    muestra los avisos de US-NOT-02. Esto deja sin efecto el ítem 3 de «Criterios diferidos» de
    `docs/process/DEPENDENCIES.md`, escrito cuando esa vista no existía; queda pendiente el visto bueno
    del PO.
  - Una cita de paquete recibe las indicaciones de todas las técnicas del paquete, cada una con su
    nombre. Se descartó un texto propio del paquete (columna y formulario nuevos en `catalog`).
  - WhatsApp no admite saltos de línea en las variables de una plantilla, así que manda el servicio y el
    enlace a «Mis citas»; el correo de respaldo lleva el texto completo. Una clienta sin cuenta solo lee
    el texto completo si le llega el correo.
  - En el expediente, las indicaciones van en una sección aparte y no entran al expediente versionado
    (SEC-006): no son un dato clínico de la clienta sino un mensaje enviado.
  - Tres migraciones, no cuatro: la tabla y sus funciones van juntas en la pieza 3/9.
  - La pieza 5 se partió en dos (5/9 y 6/9) porque medía ~550 líneas contra el tope de INT-002; decisión de José Loría del 2026-11-13.
- US-CLI-06, 2026-11-15, auditoría de la pila (decisiones de José Loría):
  - Las tres migraciones pasan de `20261113000000`–`…02` a `20261115000000`–`…02`, dentro de las piezas 2/10, 3/10
    y 4/10, para quedar después de las de US-NOT-05 (`20261114…`), que entra antes.
  - Una pieza 10/10 trae las correcciones de código (M1, M6, B2, B4) y la evidencia con los PRs (M5). M2, B9 y B1 quedan
    en `deuda` con su costo. B3, B6, B7 y B8 no se tocan: B3 va con #724 y B6 es el patrón común de los repositorios
    de entrega.
  - M3: el WhatsApp con plantilla lleva ahora el texto de cuidados y la nota aplanados en una línea
    (`buildAftercareTemplateVariables`, opción C), en vez de solo el servicio y el enlace. Es provisional: si al
    probar con Meta no sirve, se pasa a la opción B (mandar siempre también el correo). Visto bueno del PO (Kenny) a la opción C y al ítem 3 de «Criterios diferidos»: 2026-11-15, por mensaje.
