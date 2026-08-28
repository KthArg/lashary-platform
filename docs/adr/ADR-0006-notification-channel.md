# ADR-0006 — Canal de notificaciones: WhatsApp vía Twilio, email como respaldo

> **Estado:** aceptado (proveedor de email pendiente). **Fecha:** 2026-08-27. **Decisores:** PO + bootstrap. **Historias:** US-NOT-09 (⊕), US-NOT-03, US-NOT-07, US-NOT-08, US-CLI-06, US-NOT-04, US-NOT-05.

## Contexto

El backlog fija WhatsApp como canal por defecto de recordatorios y confirmaciones (US-NOT-03, US-NOT-07) con un canal alternativo "por definir" si falla. Enviar WhatsApp automatizado de verdad exige la WhatsApp Business Platform de Meta: número verificado, plantillas de mensaje pre-aprobadas y costo por conversación. El PO eligió gateway (opción 11b, 2026-08-27); Twilio como proveedor asumido salvo indicación contraria.

## Decisión

Una **abstracción única de canal** en `notifications` (US-NOT-09): puerto `NotificationChannel` con implementaciones intercambiables. Ninguna historia de notificaciones habla con un proveedor directamente — US-NOT-08 ya lo exige ("el envío usa el canal configurado en US-NOT-07").

- **WhatsApp:** Twilio (WhatsApp Business Platform como transporte). Requiere: cuenta Twilio, número de WhatsApp verificado del negocio, plantillas aprobadas por Meta para mensajes iniciados por el negocio (recordatorios). Costo por conversación — se presupuesta con el PO antes de activar en producción.
- **Respaldo:** email. Proveedor **pendiente de decisión del PO** (candidatos: Resend, SendGrid, SMTP de Supabase Auth para transaccionales); la abstracción hace la elección barata. Hasta activar Twilio, email es el canal por defecto en desarrollo y los primeros despliegues.
- Todo envío (intento, éxito, fallo, reintento) queda registrado en una tabla de `notifications` — los criterios de US-NOT-03/07 lo exigen; los reintentos son responsabilidad del canal, no de cada historia.
- Credenciales de Twilio/email: server-only, jamás en el repo (SEC-004).

## Alternativas consideradas

- **API de Meta directa:** sin intermediario y más barata por mensaje, pero onboarding y manejo de plantillas más crudos; Twilio lo empaqueta con mejor documentación y sandbox de pruebas. Revisable cuando el volumen justifique.
- **Enlaces `wa.me` manuales** (recomendación inicial del bootstrap para diferir costo): cero costo y cero automatización — la dueña envía cada recordatorio a mano. Descartada por el PO: quiere el canal automatizado.
- **Solo email:** incumple el backlog, que fija WhatsApp como canal por defecto.

## Consecuencias

- Costo recurrente nuevo (Twilio por conversación) y una dependencia de aprobación externa: **las plantillas de Meta tardan** — se tramitan al inicio de F2, no al final.
- El sandbox de Twilio permite desarrollar y probar US-NOT-03/08 sin número verificado.
- Cambiar de proveedor después = una implementación nueva del puerto; ninguna historia se reescribe.
- Pendiente que bloquea el cierre de US-NOT-09, no este ADR: elección del proveedor de email por el PO.
