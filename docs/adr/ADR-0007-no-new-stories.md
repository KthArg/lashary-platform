# ADR-0007 — El backlog no admite historias nuevas; el trabajo fundacional se pliega en las existentes

> **Estado:** aceptado. **Fecha:** 2026-08-29. **Decisores:** PO (decisión firme), bootstrap (objeción registrada).

## Contexto

El bootstrap identificó capacidades citadas por criterios de historias existentes pero no construidas por ninguna (bitácora, ledger de pagos, canal de notificaciones, gateway del CMS, vista de cuenta, fundacional técnico) y propuso 14 historias nuevas con dos epics. El PO decidió el 2026-08-29, de forma explícita y reafirmada: **el backlog se mantiene exactamente con sus 51 historias originales; no se crean historias en Jira.**

## Decisión

El trabajo fundacional y las capacidades citadas-pero-no-construidas se entregan **dentro de las historias existentes que las exigen**, como parte de sus criterios. Ningún ID de historia inventado existe en el repositorio. Mapa de plegado (autoridad: [DEPENDENCIES.md](../process/DEPENDENCIES.md)):

| Capacidad | Se construye con |
|---|---|
| Bitácora de auditoría | US-AGE-13 — la primera historia que la exige; las demás la reusan |
| Modelo de datos, seeds, CI, job de tests | las primeras historias de F1 que crean código (US-AGE-08, US-AUTH-01/02) |
| Harness RLS + tests de aislamiento | la primera tabla con RLS (US-AUTH-02 / US-AGE-08); obligatorio desde entonces (SEC-002) |
| Ledger append-only | US-AGE-12 (genera el cargo) y US-MOR-01 (saldo = suma de asientos) |
| Registro de pago con comprobante | US-MOR-03 (regularización) y US-SHOP-02 (checkout); anticipos en US-AGE-13 |
| Export tabular del ledger | US-MOR-04 (control histórico de pagos) |
| Canal de notificaciones (Twilio + email, registro de envíos) | US-NOT-03 — sus criterios ya piden reintentos y registro |
| Gateway del CMS | US-LAND-01 (primera consumidora) y US-BLOG-02 |
| Aprobación manual de reservas | US-AGE-09 recupera su texto original: cubre flujo de aprobación **y** constraint (ADR-0002/0003) |
| Admin agenda por clienta | cláusula existente de US-MOR-02 |
| Vista de cuenta de la clienta | US-MOR-03 ("desde su estado de cuenta") + US-CLI-06 ("visible en la vista del cliente") |
| Stock y pedidos admin | criterios existentes de US-SHOP-02 y US-PROD-02/03 |
| Backups | tarea operativa de plataforma, sin historia; se documenta en `platform/SPEC.md` |

Las features `platform`, `audit`, `account` y `content` siguen existiendo como carpetas (el código necesita un dueño ARCH-006), pero pueden listar cero o pocas historias: su trabajo llega como parte de historias de otras features, y su SPEC lo dice.

## Alternativas consideradas

- **14 historias nuevas + 2 epics** (propuesta original del bootstrap): trazabilidad perfecta Jira↔repo y estimación visible del trabajo técnico. Descartada por decisión del PO.
- **Subtareas de Jira** en vez de historias: descartada junto con lo anterior — el backlog no se toca.

## Consecuencias

- **Ganamos:** el backlog de registro queda intacto; cero fricción con lo ya planificado en Jira.
- **Perdemos / aceptamos:** el trabajo fundacional es **invisible en Jira** — no se estima ni se rastrea allí; las historias que lo cargan (US-AGE-13, US-NOT-03, US-AGE-09, US-MOR-03, US-AGE-12) son ahora **más grandes que sus puntos originales**, y el sprint que las tome debe saberlo; el estado fino de ese trabajo vive solo en los `SPEC.md` (campo `falta:`).
- **Objeción registrada (bootstrap, 2026-08-29):** capacidades transversales sin historia propia tienden a construirse a medias dentro de la historia que primero las necesita, optimizadas para ese caso; y la desviación puntos-vs-trabajo real distorsiona la velocidad del equipo. El PO escuchó el costo y decidió mantener el backlog intacto. Constancia: visto y aceptado, no omitido.
- La regla de trazabilidad (§ documentación) se lee así desde hoy: toda historia del backlog resuelve a una feature; una feature puede además cargar trabajo de infraestructura sin ID, documentado en su SPEC y en DEPENDENCIES.md.
