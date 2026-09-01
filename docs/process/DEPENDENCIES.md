# Grafo de dependencias entre historias

> **Autoridad:** qué historia depende de cuál, y qué infraestructura sin historia propia carga cada una (ADR-0007). Se consulta en cada planificación de sprint (INT-007); lo lee `/empezables`. **Lectores:** PO y equipo al planificar; skills. **Estado:** vigente. **Actualizado:** 2026-09-01.
> Derivado del backlog en [../backlog/](../backlog/) (que no trae columna de dependencias). Si el backlog cambia, este archivo se revisa en el mismo PR.

## Infraestructura sin historia propia (ADR-0007)

El backlog se mantiene en sus 51 historias; estas capacidades se construyen **dentro** de la primera historia que las exige. La historia portadora es más grande que sus puntos — el sprint que la tome debe saberlo:

| Infraestructura | Historia portadora | La reusan |
|---|---|---|
| Modelo de datos, seeds, CI + job de tests | primeras historias de F1 (US-AGE-08, US-AUTH-01/02) | todas |
| Harness RLS + tests de aislamiento (SEC-002) | primera tabla con RLS (US-AUTH-02 / US-AGE-08) | toda tabla nueva |
| Bitácora de auditoría | **US-AGE-13** | AGE-06/09/12, CLI-04, MOR-02/04/05 |
| Ledger append-only (DOM-005) | **US-AGE-12** y **US-MOR-01** | MOR-*, PROM, cierre |
| Registro de pago con comprobante (DOM-008) | **US-MOR-03** y **US-SHOP-02** | regularización, checkout |
| Export tabular del ledger | **US-MOR-04** | facturación externa (§ ROADMAP) |
| Canal de notificaciones (ADR-0006) | **US-NOT-03** | NOT-04..08, CLI-06 |
| Gateway del CMS (ADR-0001) | **US-LAND-01** y **US-BLOG-02** | LAND-*, BLOG-03 |
| Vista de cuenta de la clienta | **US-MOR-03** y **US-CLI-06** | LAND-06 (progreso visible) |
| Aprobación manual + constraint | **US-AGE-09** — su texto (aprobación, ADR-0003) y sus criterios (constraint, ADR-0002) son dos entregables de la misma historia | AGE-05 |
| Agendar en nombre de una clienta | cláusula de **US-MOR-02** | — |
| Backups | tarea operativa de `platform`, sin historia | — |

## Tabla de dependencias

| Historia | Depende de | Nota |
|---|---|---|
| US-AUTH-01 | — | admin; porta CI/modelo si va primera |
| US-AUTH-02 | — | Google + teléfono obligatorio + dedup (gap G5 plegado); porta harness RLS |
| US-LAND-01 | — | **porta el gateway CMS** (contrato [cms-api.md](../contracts/cms-api.md)) |
| US-LAND-02 | US-LAND-01, US-AGE-08 | precios/duraciones del catálogo |
| US-LAND-07 | US-LAND-01 | |
| US-LAND-04 | US-LAND-01 | |
| US-LAND-03 | US-LAND-01 | consentimiento se registra en el CMS |
| US-LAND-05 | US-LAND-01 | |
| US-LAND-06 | US-AGE-12, US-CLI-02, US-MOR-03 | progreso sobre citas completadas; visible en la vista de cuenta que porta MOR-03 |
| US-BLOG-01 | — | **cubierta por el CMS existente**; verificar criterios (borradores) |
| US-BLOG-02 | US-LAND-01 | co-porta el gateway CMS |
| US-BLOG-03 | US-BLOG-02 | |
| US-AGE-08 catálogo | — | porta modelo de datos/CI si va primera |
| US-AGE-13 anticipos | US-AGE-08 | **porta la bitácora de auditoría** |
| US-AGE-01 disponibilidad | US-AUTH-01 | |
| US-AGE-02 calendario cliente | US-AGE-01, US-AGE-08 | duración + limpieza |
| US-AGE-03 seleccionar técnica | US-AGE-08, US-AUTH-02 | primera vez según historial |
| US-AGE-09 aprobación + constraint | US-AGE-13 (bitácora para rechazos) | dos entregables: flujo de aprobación (ADR-0003) y exclusion constraint con prueba de concurrencia (ADR-0002). Pendiente **ocupa** espacio |
| US-AGE-05 reservar | US-AUTH-02, US-AGE-02, US-AGE-03, US-AGE-09, US-AGE-13 | criterio de morosidad **diferido** hasta US-MOR-02 (ver abajo) |
| US-AGE-06 cancelar | US-AGE-05 | bitácora (de AGE-13); dispara US-NOT-02 |
| US-AGE-07 bloquear espacios | US-AGE-01 | |
| US-AGE-10 reagendar | US-AGE-05 | atómico (DOM-011) |
| US-AGE-11 agenda diaria | US-AGE-05, US-CLI-05 | indicador de morosidad **diferido** hasta US-MOR-01; destaca pendientes de US-AGE-09 |
| US-AGE-12 cerrar cita | US-AGE-11 | **porta el ledger** (el cargo del cierre es su primer asiento) |
| US-AGE-04 agendar paquete | US-PROD-01, US-AGE-05 | |
| US-PROD-01 paquetes | US-AGE-08 | |
| US-PROM-01 promociones | US-AGE-08, US-PROD-01 | precio congelado (DOM-002) |
| US-PROM-02 ver paquetes/promos | US-PROM-01 | |
| US-CLI-05 crear/editar cliente | US-AUTH-01 | |
| US-CLI-01 listado clientes | US-CLI-05 | estados de UI (UI-003) |
| US-CLI-02 historial citas | US-CLI-05, US-AGE-05 | |
| US-CLI-03 anotaciones | US-CLI-02 | |
| US-CLI-04 expediente | US-CLI-05, US-AGE-13 (bitácora) | dato sensible (SEC-006); test RLS obligatorio |
| US-CLI-06 cuidados post | US-AGE-12, US-NOT-03, US-AGE-08 | **co-porta la vista de cuenta** (indicaciones visibles) |
| US-MOR-01 detección | US-AGE-12 | co-porta el ledger (saldo = suma de asientos); gracia + aviso previo (DOM-012) |
| US-MOR-02 bloqueo agenda | US-MOR-01 | incluye su cláusula de admin-agenda-por-clienta; habilita el criterio diferido de US-AGE-05 |
| US-MOR-03 regularizar | US-MOR-02, US-AUTH-02 | **porta el registro de pago con comprobante y la vista de estado de cuenta** |
| US-MOR-04 histórico | US-MOR-01 | **porta el export tabular del ledger** |
| US-MOR-05 levantar/perdonar | US-MOR-01 | bitácora (de AGE-13) |
| US-NOT-01 notif. reserva | US-AGE-05, US-AUTH-01 | |
| US-NOT-02 notif. cancelación/reagendado | US-AGE-06, US-AGE-10 | |
| US-NOT-03 recordatorio 24h | US-AGE-05 | **porta el canal completo** (ADR-0006): puerto, Twilio, email fallback, registro de envíos y reintentos |
| US-NOT-07 canal alternativo | US-NOT-03 | |
| US-NOT-08 confirmación asistencia | US-NOT-03, US-AGE-05, US-AGE-13 | |
| US-NOT-04 recordatorio pago | US-NOT-03, US-MOR-02 | |
| US-NOT-05 re-aplicación | US-NOT-03, US-AGE-08, US-AGE-12 | |
| US-NOT-06 inactivos | US-CLI-01, US-NOT-03 | incluye opción de baja |
| US-PROD-02 grid productos | criterio 3 sin resolver — ver § Criterios ambiguos | grid público (criterios 1-2) sin dependencias; incluye su parte de administración de productos (ADR-0007) |
| US-PROD-03 detalle producto | US-PROD-02 | stock indicado según control de US-SHOP-02 |
| US-SHOP-01 carrito | US-PROD-03, US-AUTH-02 | |
| US-SHOP-02 checkout | US-SHOP-01, US-MOR-03 (patrón de comprobante) | **porta control de existencias y pedidos admin** |

## Criterios diferidos (dependencias hacia adelante)

Historias tempranas con **un criterio** que depende de una historia de fase posterior. Se implementan con el criterio tras un flag o punto de extensión; el `SPEC.md` las registra `en_progreso` con el faltante nombrado — no se marcan `terminada` hasta cerrarlo:

1. **US-AGE-05** — "valida que el cliente no tenga morosidad activa" → requiere US-MOR-02 (F3).
2. **US-AGE-11** — "indica si el cliente tiene morosidad activa" → requiere US-MOR-01 (F3).
3. **US-CLI-06** — "visible en la vista del cliente" → la vista la porta US-MOR-03 (F3); si CLI-06 se implementa antes, ese criterio queda diferido con el faltante nombrado.

## Criterios ambiguos (dependencia indeterminada)

Criterios cuyo texto admite dos implementaciones con **dependencias distintas**. No se planifican hasta que el PO elija una (INT-007); la fila de la historia lo dice. Al resolverse, la fila pasa a nombrar el ID real y esta entrada se borra.

1. **US-PROD-02** — "los productos son administrables desde el panel o CMS":
   - **panel** → depende de **US-AUTH-01** (auth de administradora) y tabla propia `store_products` (ARCH-006);
   - **CMS** → depende de **US-LAND-01** (porta el gateway, [ADR-0001](../adr/ADR-0001-external-cms.md)) y exige extender [../contracts/cms-api.md](../contracts/cms-api.md) por INT-003 — ese contrato no lista "producto" entre sus tipos de contenido y su estado es `borrador`.

   En ambos casos la historia **no es arrancable** hoy. Detectado 2026-09-01; pendiente de decisión del PO.
