# Grafo de dependencias entre historias

> **Autoridad:** qué historia depende de cuál. Se consulta en cada planificación de sprint (INT-007) y lo lee `/empezables`. **Lectores:** PO y equipo al planificar; skills. **Estado:** vigente. **Actualizado:** 2026-08-27.
> Derivado del backlog en [../backlog/](../backlog/) (que no trae columna de dependencias). Si el backlog cambia, este archivo se revisa en el mismo PR.

## Prerrequisitos globales

`US-TEC-02` (modelo de datos y seeds) y `US-TEC-03` (CI + verify local) preceden a **toda** historia con código. No se repiten en la tabla.
Historias marcadas ⊕ son propuestas de Fase 1 del bootstrap, pendientes de alta en Jira; el CSV del repo se actualiza cuando el PO las apruebe.

## Tabla

| Historia | Depende de | Nota |
|---|---|---|
| US-TEC-01 ⊕ bitácora | — | |
| US-TEC-04 ⊕ harness RLS | US-TEC-02 | |
| US-TEC-05 ⊕ backups | US-TEC-02 | |
| US-AUTH-01 | — | admin: usuario/contraseña |
| US-AUTH-02 | — | Google + teléfono obligatorio + dedup (absorbe gap G5) |
| US-CMS-01 ⊕ contrato CMS | ADR-0001 | contrato en [../contracts/cms-api.md](../contracts/cms-api.md) |
| US-LAND-01 | US-CMS-01 | |
| US-LAND-02 | US-CMS-01, US-AGE-08 | precios/duraciones del catálogo |
| US-LAND-07 | US-CMS-01 | |
| US-LAND-04 | US-CMS-01 | |
| US-LAND-03 | US-CMS-01 | consentimiento se registra en el CMS |
| US-LAND-05 | US-CMS-01 | |
| US-LAND-06 | US-AGE-12, US-CLI-02 | progreso sobre citas completadas; visible en expediente |
| US-BLOG-01 | — | **cubierta por el CMS existente**; verificar criterios (borradores) |
| US-BLOG-02 | US-CMS-01 | |
| US-BLOG-03 | US-CMS-01, US-BLOG-02 | |
| US-AGE-08 catálogo | — | |
| US-AGE-13 anticipos | US-AGE-08, US-TEC-01 | exoneración auditada |
| US-AGE-01 disponibilidad | US-AUTH-01 | |
| US-AGE-02 calendario cliente | US-AGE-01, US-AGE-08 | duración + limpieza |
| US-AGE-03 seleccionar técnica | US-AGE-08, US-AUTH-02 | primera vez según historial |
| US-AGE-09 constraint | — | invariante de datos; ver [ADR-0002](../adr/ADR-0002-exclusion-constraint.md) |
| US-AGE-05 reservar | US-AUTH-02, US-AGE-02, US-AGE-03, US-AGE-09, US-AGE-13 | criterio de morosidad **diferido** hasta US-MOR-02 (ver abajo) |
| US-AGE-15 ⊕ aprobación manual | US-AGE-05 | flujo de negocio separado del constraint; [ADR-0003](../adr/ADR-0003-manual-approval.md) |
| US-AGE-06 cancelar | US-AGE-05, US-TEC-01 | dispara US-NOT-02 |
| US-AGE-07 bloquear espacios | US-AGE-01 | |
| US-AGE-10 reagendar | US-AGE-05 | atómico (DOM-011) |
| US-AGE-11 agenda diaria | US-AGE-05, US-CLI-05 | indicador de morosidad **diferido** hasta US-MOR-01 |
| US-AGE-12 cerrar cita | US-AGE-11, US-PAG-02, US-TEC-01 | el cierre escribe el cargo en el ledger |
| US-AGE-14 ⊕ admin agenda por clienta | US-AGE-05, US-CLI-05 | excepción de morosidad in situ (US-MOR-02) |
| US-AGE-04 agendar paquete | US-PROD-01, US-AGE-05 | |
| US-PROD-01 paquetes | US-AGE-08 | |
| US-PROM-01 promociones | US-AGE-08, US-PROD-01 | precio congelado (DOM-002) |
| US-PROM-02 ver paquetes/promos | US-PROM-01 | |
| US-CLI-05 crear/editar cliente | US-AUTH-01 | |
| US-CLI-01 listado clientes | US-CLI-05 | estados de UI (UI-003) |
| US-CLI-02 historial citas | US-CLI-05, US-AGE-05 | |
| US-CLI-03 anotaciones | US-CLI-02 | |
| US-CLI-04 expediente | US-CLI-05, US-TEC-01, US-TEC-04 | dato sensible (SEC-006) |
| US-CLI-06 cuidados post | US-AGE-12, US-NOT-09, US-AGE-08 | visible en cuenta: parte diferida a US-CTA-01 |
| US-PAG-02 ⊕ ledger | US-TEC-01 | append-only (DOM-005) |
| US-PAG-01 ⊕ registrar pago | US-PAG-02 | comprobante validado por contenido (DOM-008) |
| US-PAG-03 ⊕ export tabular | US-PAG-02 | facturación es externa; el export es el puente |
| US-MOR-01 detección | US-AGE-12, US-PAG-02 | gracia + aviso previo (DOM-012) |
| US-MOR-02 bloqueo agenda | US-MOR-01 | habilita el criterio diferido de US-AGE-05 |
| US-MOR-03 regularizar | US-MOR-02, US-PAG-01, US-AUTH-02 | entrada desde cuenta: diferida a US-CTA-01 |
| US-MOR-04 histórico | US-MOR-01 | |
| US-MOR-05 levantar/perdonar | US-MOR-01, US-TEC-01 | |
| US-NOT-01 notif. reserva | US-AGE-05, US-AUTH-01 | |
| US-NOT-02 notif. cancelación/reagendado | US-AGE-06, US-AGE-10 | |
| US-NOT-09 ⊕ canal | [ADR-0006](../adr/ADR-0006-notification-channel.md) | Twilio WhatsApp + email fallback; registro de envíos |
| US-NOT-03 recordatorio 24h | US-NOT-09, US-AGE-05 | |
| US-NOT-07 canal alternativo | US-NOT-09, US-NOT-03 | |
| US-NOT-08 confirmación asistencia | US-NOT-09, US-AGE-05, US-AGE-13 | |
| US-NOT-04 recordatorio pago | US-NOT-09, US-MOR-02 | |
| US-NOT-05 re-aplicación | US-NOT-09, US-AGE-08, US-AGE-12 | |
| US-NOT-06 inactivos | US-CLI-01, US-NOT-09 | incluye opción de baja |
| US-CTA-01 ⊕ cuenta del cliente | US-AUTH-02, US-AGE-05, US-PAG-02 | destraba los diferidos de CLI-06 y MOR-03 |
| US-SHOP-03 ⊕ admin productos/pedidos | US-AUTH-01 | existencias y pedidos |
| US-PROD-02 grid productos | US-SHOP-03 | |
| US-PROD-03 detalle producto | US-PROD-02 | stock desde US-SHOP-03 |
| US-SHOP-01 carrito | US-PROD-03, US-AUTH-02 | |
| US-SHOP-02 checkout | US-SHOP-01, US-SHOP-03, US-PAG-01 | reutiliza patrón de comprobante |

## Criterios diferidos (dependencias hacia adelante)

Tres historias tempranas tienen **un criterio** que depende de una historia de fase posterior. Se implementan con el criterio detrás de un flag o punto de extensión, y el `SPEC.md` lo registra como `en_progreso` con el faltante nombrado — no se marcan `terminada` hasta cerrar el criterio:

1. **US-AGE-05** — "valida que el cliente no tenga morosidad activa" → requiere US-MOR-02 (F3).
2. **US-AGE-11** — "indica si el cliente tiene morosidad activa" → requiere US-MOR-01 (F3).
3. **US-CLI-06 / US-MOR-03** — "visible en la vista del cliente" / "desde su estado de cuenta" → requiere US-CTA-01 (F3).

Alternativa: el PO puede partir esos criterios como historias de seguimiento en Jira; hasta entonces, la regla de arriba.
