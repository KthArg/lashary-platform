# Roadmap — fases derivadas del backlog

> **Autoridad:** el orden del trabajo: fases y su objetivo. **Derivado** del backlog en [backlog/](backlog/) (prioridad) más [process/DEPENDENCIES.md](process/DEPENDENCIES.md) (grafo). No duplica criterios ni puntos: para eso está el backlog. **Lectores:** PO y equipo al planificar. **Estado:** vigente — se revisa cuando el backlog cambia. **Actualizado:** 2026-08-27.

Una **fase** es un objetivo de producto, no un sprint; cada fase abarca varios sprints de dos semanas. Una historia entra a sprint solo con sus dependencias `terminada` (INT-007). Historias ⊕ = propuestas del bootstrap, pendientes de alta en Jira.

## F0 — Fundación *(el repo es operable y seguro)*

Sale: modelo de datos y seeds (US-TEC-02 ⊕), CI y verify local (US-TEC-03 ⊕), harness RLS con tests de aislamiento (US-TEC-04 ⊕), backups (US-TEC-05 ⊕), bitácora de auditoría (US-TEC-01 ⊕), auth de administradora (US-AUTH-01) y de clientas (US-AUTH-02), contrato con el CMS (US-CMS-01 ⊕). ADRs 0001–0006 aprobados.

**Hecho cuando:** una clienta puede autenticarse, los tests de aislamiento corren en CI, y `verify.sh` falla ante una violación de reglas.

## F1 — Agendar *(una clienta reserva de verdad)*

Sale: catálogo (US-AGE-08, US-AGE-13), disponibilidad (US-AGE-01, US-AGE-07), calendario y selección (US-AGE-02, US-AGE-03), constraint de no-solape (US-AGE-09), reserva (US-AGE-05), aprobación manual (US-AGE-15 ⊕), cancelación (US-AGE-06), landing pública (US-LAND-01, US-LAND-02, US-LAND-07), notificaciones de panel (US-NOT-01, US-NOT-02).

**Hecho cuando:** la prueba de N reservas simultáneas pasa en CI y una clienta real puede reservar desde la landing.

## F2 — Operar el día *(la dueña trabaja desde el panel)*

Sale: agenda diaria (US-AGE-11), cierre de citas (US-AGE-12), reagendado (US-AGE-10), admin agenda por clienta (US-AGE-14 ⊕), paquetes (US-PROD-01, US-AGE-04), gestión de clientas (US-CLI-01…05), ledger y pagos (US-PAG-01 ⊕, US-PAG-02 ⊕), canal de notificaciones (US-NOT-09 ⊕), confirmación de asistencia (US-NOT-08), recordatorios de cita (US-NOT-03, US-NOT-07), cuidados post-tratamiento (US-CLI-06).

**Hecho cuando:** la dueña atiende una jornada completa — abrir agenda, cerrar citas, registrar pagos — sin salir del panel.

## F3 — Cobrar y retener *(morosidad, fidelidad, contenido)*

Sale: morosidad completa (US-MOR-01…05), cuenta del cliente (US-CTA-01 ⊕), export del ledger (US-PAG-03 ⊕), recordatorios de pago/re-aplicación/inactivos (US-NOT-04, US-NOT-05, US-NOT-06), fidelidad (US-LAND-05, US-LAND-06), about y galería (US-LAND-04, US-LAND-03), blog público (US-BLOG-02, US-BLOG-03), promociones (US-PROM-01, US-PROM-02).

**Hecho cuando:** el ciclo cargo → morosidad → aviso → regularización → liberación corre completo con el periodo de gracia y el override manual auditado.

## F4 — Tienda

Sale: admin de productos, existencias y pedidos (US-SHOP-03 ⊕), grid y detalle (US-PROD-02, US-PROD-03), carrito y checkout (US-SHOP-01, US-SHOP-02).

**Hecho cuando:** un pedido con comprobante llega al panel y descuenta existencias.

## Fuera de alcance (tan vinculante como lo de adentro)

Facturación electrónica e integración tributaria (externa — de ahí US-PAG-03), cumplimiento formal de protección de datos (los mínimos técnicos aplican igual: SEC-006), CMS a medida nuevo (existe uno: ADR-0001), multi-tenant, multi-sede, apps nativas, planilla, POS. **Pagos reales: el sistema jamás toca una pasarela; ningún dato de tarjeta existe en el sistema, ni siquiera simulado.**
