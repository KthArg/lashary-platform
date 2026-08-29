---
feature: payments
dri: pendiente
estado: no_iniciada
actualizado: 2026-08-29
historias:
  - id: US-AGE-13
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# payments

Anticipos, y la infraestructura de pagos sin historia propia (ADR-0007): el ledger append-only (DOM-005) nace con US-AGE-12/US-MOR-01, el registro de pago con comprobante con US-MOR-03/US-SHOP-02, y el export tabular con US-MOR-04. Esta feature es duena de las tablas y el value object; esas historias la construyen. Sin pasarela jamas.

## Qué hace hoy

Hoy: no existe. Se detiene antes de todo.

## Contrato público

Sin contrato todavía. Al crearse, entra por `index.ts` (ARCH-003).
