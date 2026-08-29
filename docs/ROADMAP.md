# Roadmap — fases derivadas del backlog

> **Autoridad:** el orden del trabajo: fases y su objetivo. **Derivado** del backlog en [backlog/](backlog/) (prioridad) más [process/DEPENDENCIES.md](process/DEPENDENCIES.md) (grafo). No duplica criterios ni puntos: para eso está el backlog. **Lectores:** PO y equipo al planificar. **Estado:** vigente — se revisa cuando el backlog cambia. **Actualizado:** 2026-08-29.

Una **fase** es un objetivo de producto, no un sprint; cada fase abarca varios sprints de dos semanas. Una historia entra a sprint solo con sus dependencias `terminada` (INT-007). El backlog se mantiene en sus 51 historias (ADR-0007): la infraestructura sin historia propia viaja dentro de las historias portadoras marcadas en DEPENDENCIES.md — esas historias pesan más que sus puntos.

## F0 — Fundación *(el repo es operable y seguro)*

Sale: auth de administradora (US-AUTH-01) y de clientas (US-AUTH-02). Las portadoras de F0/F1 arrastran la infraestructura: modelo de datos, seeds, CI con job de tests y harness RLS (ADR-0007). Gobierno, reglas, CI de reglas y ADRs 0001–0007: ya entregados por el bootstrap.

**Hecho cuando:** una clienta puede autenticarse, los tests de aislamiento corren en CI, y `verify.sh` falla ante una violación de reglas.

## F1 — Agendar *(una clienta reserva de verdad)*

Sale: catálogo (US-AGE-08), anticipos + bitácora (US-AGE-13), disponibilidad (US-AGE-01, US-AGE-07), calendario y selección (US-AGE-02, US-AGE-03), aprobación manual + constraint de no-solape (US-AGE-09), reserva (US-AGE-05), cancelación (US-AGE-06), landing pública + gateway CMS (US-LAND-01, US-LAND-02, US-LAND-07), notificaciones de panel (US-NOT-01, US-NOT-02).

**Hecho cuando:** la prueba de N reservas simultáneas pasa en CI y una clienta real puede solicitar una reserva desde la landing y recibir la decisión de la dueña.

## F2 — Operar el día *(la dueña trabaja desde el panel)*

Sale: agenda diaria (US-AGE-11), cierre de citas + ledger (US-AGE-12), reagendado (US-AGE-10), paquetes (US-PROD-01, US-AGE-04), gestión de clientas (US-CLI-01…05), canal de notificaciones + recordatorio 24h (US-NOT-03), confirmación de asistencia (US-NOT-08), canal alternativo (US-NOT-07), cuidados post-tratamiento (US-CLI-06).

**Hecho cuando:** la dueña atiende una jornada completa — aprobar reservas, abrir agenda, cerrar citas — sin salir del panel.

## F3 — Cobrar y retener *(morosidad, fidelidad, contenido)*

Sale: morosidad completa con pagos, comprobantes, vista de cuenta y export (US-MOR-01…05), recordatorios de pago/re-aplicación/inactivos (US-NOT-04, US-NOT-05, US-NOT-06), fidelidad (US-LAND-05, US-LAND-06), about y galería (US-LAND-04, US-LAND-03), blog público (US-BLOG-01 verificación, US-BLOG-02, US-BLOG-03), promociones (US-PROM-01, US-PROM-02).

**Hecho cuando:** el ciclo cargo → morosidad → aviso → regularización con comprobante → liberación corre completo con el periodo de gracia y el override manual auditado.

## F4 — Tienda

Sale: grid y detalle con administración de productos (US-PROD-02, US-PROD-03), carrito (US-SHOP-01), checkout con comprobante, existencias y pedidos (US-SHOP-02).

**Hecho cuando:** un pedido con comprobante llega al panel y descuenta existencias.

## Fuera de alcance (tan vinculante como lo de adentro)

Facturación electrónica e integración tributaria (externa — de ahí el export de US-MOR-04), cumplimiento formal de protección de datos (los mínimos técnicos aplican igual: SEC-006), CMS a medida nuevo (existe uno: ADR-0001), historias nuevas en el backlog (ADR-0007), multi-tenant, multi-sede, apps nativas, planilla, POS. **Pagos reales: el sistema jamás toca una pasarela; ningún dato de tarjeta existe en el sistema, ni siquiera simulado.**
