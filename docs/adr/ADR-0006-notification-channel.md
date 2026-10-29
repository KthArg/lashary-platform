# ADR-0006 — Canal de notificaciones: WhatsApp directo con la Graph API de Meta, email como respaldo

> **Estado:** aceptado. **Fecha:** 2026-08-27. **Decisores:** PO + bootstrap. **Historias:** US-NOT-03 (portadora del canal, ADR-0007), US-NOT-07, US-NOT-08, US-CLI-06, US-NOT-04, US-NOT-05.
>
> **Registro de la decisión (2026-10-20):** el PO eligió Resend como proveedor de email de respaldo, resolviendo el pendiente del ítem de Consecuencias. `notifications/channels/resend-email-channel.ts` lo implementa detrás del puerto `NotificationChannel`.
>
> **Registro de la decisión (2026-10-21):** el negocio todavía no tiene número de WhatsApp Business ni dominio de email propios. `twilio-whatsapp-channel.ts` queda listo para activarse solo con variables de entorno: sin `TWILIO_CONTENT_SID` manda texto libre (sandbox de Twilio); con un número real, Meta exige plantilla aprobada — el canal manda `ContentSid`/`ContentVariables` en vez de `Body` cuando esa variable está presente. La plantilla a pedir en Meta debe declarar exactamente 2 variables, en este orden: técnica reservada, fecha y hora de la cita (`domain/reminder-message.ts`, `buildReminderTemplateVariables`).
>
> **Superado por el registro siguiente, mismo día (hallazgo B9 de la auditoría del 2026-10-23):** `twilio-whatsapp-channel.ts` no llegó a activarse en producción y se retiró del todo horas después, el mismo 2026-10-21, por el siguiente registro. El párrafo de arriba queda solo como rastro histórico de esa decisión intermedia; `twilio-whatsapp-channel.ts` no existe en el código.
>
> **Registro de la decisión (2026-10-21, revierte Twilio):** quien pide el proyecto exige trabajar directo con Meta for Developers, sin intermediario. Se retira `twilio-whatsapp-channel.ts` y se reemplaza por `meta-whatsapp-channel.ts` contra la Graph API (`https://graph.facebook.com/{version}/{phone-number-id}/messages`), detrás del mismo puerto `NotificationChannel` y con el mismo patrón (`fetch` directo, sin SDK). El contrato de plantilla no cambia: 2 variables en el mismo orden (técnica, fecha y hora), solo que ahora van en `template.components[0].parameters` en vez de `ContentVariables`. Variables de entorno nuevas: `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_TEMPLATE_NAME`, `META_WHATSAPP_TEMPLATE_LANGUAGE`.

## Contexto

El backlog fija WhatsApp como canal por defecto de recordatorios y confirmaciones (US-NOT-03, US-NOT-07) con un canal alternativo "por definir" si falla. Enviar WhatsApp automatizado de verdad exige la WhatsApp Business Platform de Meta: número verificado, plantillas de mensaje pre-aprobadas y costo por conversación. El PO eligió gateway (opción 11b, 2026-08-27); Twilio fue el proveedor asumido al inicio, pero quien pide el proyecto exige integrar directo con Meta for Developers (registro del 2026-10-21): la Graph API de Meta es la misma plataforma que usa Twilio por debajo, sin intermediario.

## Decisión

Una **abstracción única de canal** en `notifications`, construida con US-NOT-03 (ADR-0007): puerto `NotificationChannel` con implementaciones intercambiables. Ninguna historia de notificaciones habla con un proveedor directamente — US-NOT-08 ya lo exige ("el envío usa el canal configurado en US-NOT-07").

- **WhatsApp:** Graph API de Meta directo (`developers.facebook.com`), sin Twilio ni ningún otro intermediario. Requiere: app de Meta for Developers con el producto WhatsApp, número de WhatsApp Business verificado del negocio, token de acceso (System User, permanente) y plantillas aprobadas por Meta para mensajes iniciados por el negocio (recordatorios). Costo por conversación, igual que con cualquier proveedor — se presupuesta con el PO antes de activar en producción.
- **Respaldo:** email, vía **Resend** (decisión del PO, 2026-10-20; candidatos descartados: SendGrid, SMTP de Supabase Auth para transaccionales). Hasta activar WhatsApp, email es el canal por defecto en desarrollo y los primeros despliegues.
- Todo envío (intento, éxito, fallo, reintento) queda registrado en una tabla de `notifications` — los criterios de US-NOT-03/07 lo exigen; los reintentos son responsabilidad del canal, no de cada historia.
- Credenciales de Meta/email: server-only, jamás en el repo (SEC-004).

## Alternativas consideradas

- **Twilio como intermediario** (decisión original, 2026-08-27): mejor documentación y sandbox de pruebas, pero agrega un proveedor y un costo adicional sobre el mismo WhatsApp Business Platform de Meta. Descartada el 2026-10-21: quien pide el proyecto exige la integración directa con Meta.
- **Enlaces `wa.me` manuales** (recomendación inicial del bootstrap para diferir costo): cero costo y cero automatización — la dueña envía cada recordatorio a mano. Descartada por el PO: quiere el canal automatizado.
- **Solo email:** incumple el backlog, que fija WhatsApp como canal por defecto.

## Consecuencias

- Costo recurrente por conversación (Meta) y una dependencia de aprobación externa: **las plantillas de Meta tardan** — se tramitan al inicio de F2, no al final.
- El modo de prueba de Meta for Developers (número de prueba + plantilla `hello_world`) permite desarrollar y probar el pipeline de envío sin verificación de negocio ni número propio.
- Sin intermediario, el equipo maneja directo la renovación del token (System User) y el formato de la Graph API; se pierde el sandbox y la documentación empaquetada de Twilio.
- Cambiar de proveedor después = una implementación nueva del puerto; ninguna historia se reescribe (ya pasó una vez, de Twilio a Meta directo).
- Sigue pendiente, operativo y no de este ADR: el número de WhatsApp Business real, el token permanente, la plantilla aprobada por Meta, y el dominio verificado en Resend. Hasta tenerlos, ambos canales corren con sus adaptadores reales sin configurar en producción.
