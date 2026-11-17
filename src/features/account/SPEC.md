---
feature: account
dri: pendiente
estado: en_progreso
actualizado: 2026-11-17
historias:
  []
flags: []
deuda: []
defectos: []
---

# account

Vista de cuenta de la clienta (mis citas, saldo). Sin historia propia (ADR-0007): se materializa con US-MOR-03 (estado de cuenta); esta feature es duena del codigo de la vista. Las indicaciones de cuidado de US-CLI-06 no van aqui: se muestran en «Mis citas» (decision del 2026-11-13, `docs/process/DEPENDENCIES.md`, item 3 de «Criterios diferidos»).

## Qué hace hoy

Hoy: la sección «Estado de cuenta» de `/portal/cuenta` (US-MOR-03), debajo de los datos de la clienta. `ui/statement/` muestra lo que debe en morosidades confirmadas (el total y cada una con «Pendiente desde»), las instrucciones de pago (texto de relleno hasta tener los datos de la cuenta del estudio) y el estado de su comprobante más reciente: en revisión, aprobado o rechazado con el motivo; una saldada en los últimos 30 días se ve como «Saldada», con el pago que la saldó. Si no debe nada, la sección dice «No tienes saldos pendientes» sin total ni instrucciones de pago. Mientras la morosidad está activa, cada tarjeta trae `RegularizationForm`, el formulario del comprobante que es de `delinquency` y sale por su `index.ts`. Los datos los lee `AccountStatement` (componente de servidor) por `regularizationService.loadMyAccount` de `delinquency`; esta feature no lee tablas de otra (ARCH-005). Estados (UI-003): carga (`AccountStatementLoading`, en un `Suspense`), vacío («No tienes saldos pendientes») y error con alerta. La tarjeta muestra la fecha de la morosidad y no la de la cita, que es de `scheduling`. Prueba: `ui/statement/__tests__/AccountStatementView.test.tsx`.

## Contrato público

`index.ts` exporta `AccountStatement` y `AccountStatementLoading`, que usa la página `/portal/cuenta` (ARCH-003). No ofrece funciones a otras features.
