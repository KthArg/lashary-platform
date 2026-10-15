---
feature: scheduling
dri: pendiente
estado: en_progreso
actualizado: "2026-10-15"
historias:
  - id: US-AGE-01
    estado: no_iniciada
  - id: US-AGE-02
    estado: no_iniciada
  - id: US-AGE-03
    estado: en_progreso
    evidencia: "criterios 1, 3 y 4 demostrados; tests: technique-selection.test.ts, select-technique.test.ts, no-appointment-history.test.ts, load-technique-selection-page.test.ts, TechniqueSelectionPageView.test.tsx"
    falta: "criterio 2 (detectar primera vez/re-aplicación por historial de citas) diferido: no existe scheduling_appointments todavía (la trae US-AGE-05, que depende de esta historia). Punto de extensión: application/no-appointment-history.ts (ClientHistoryPort), hoy siempre reporta sin historial; la corrección manual ya está resuelta en el use-case (isFirstTimeOverride). Ver docs/process/DEPENDENCIES.md, Criterios diferidos."
  - id: US-AGE-04
    estado: no_iniciada
  - id: US-AGE-05
    estado: no_iniciada
  - id: US-AGE-06
    estado: no_iniciada
  - id: US-AGE-07
    estado: no_iniciada
  - id: US-AGE-09
    estado: terminada
    evidencia: "criterios 1 a 4 y el flujo de aprobación (ADR-0003) demostrados; tests: supabase/tests/database/scheduling_no_overlap.test.sql (criterios 1 a 3), db/__tests__/appointment-concurrency.integration.test.ts (criterio 4, 10 reservas simultáneas por ronda, 3 rondas), supabase/tests/database/scheduling_create_appointment.test.sql, supabase/tests/database/scheduling_decide_appointment.test.sql, application/__tests__/create-appointment.test.ts, application/__tests__/decide-appointment.test.ts, db/__tests__/appointment-repository.test.ts, db/__tests__/appointment-decision-repository.test.ts, ui/approval-queue/__tests__/approval-queue-actions.test.ts, ui/approval-queue/__tests__/ApprovalQueue.test.tsx, __tests__/rls-isolation.test.ts. Criterio 5, parte de código: error tipado SpaceNotAvailable y evento scheduling.appointment_overlap_rejected (db/appointment-repository.ts). La alerta real se traslada a US-AGE-05 (docs/process/DEPENDENCIES.md, Criterios trasladados, ítem 4)"
  - id: US-AGE-10
    estado: no_iniciada
  - id: US-AGE-11
    estado: no_iniciada
  - id: US-AGE-12
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# scheduling

Agenda completa. US-AGE-09 cubre el flujo de aprobacion manual (su texto original, ADR-0003) Y el constraint de no-solape (sus criterios, ADR-0002); recurso explicito (ADR-0005). Agendar en nombre de una clienta: clausula de US-MOR-02 (ADR-0007).

## Qué hace hoy

`US-AGE-03` en progreso: primer código de la feature.

- Capa `domain/` (`technique-selection.ts`): función pura `selectTechnique(technique, isFirstTime)` — aplica la política de duración (criterio 3: duración según primera vez o retoque, más `bufferMin` del catálogo) y el invariante de una sola técnica por selección (criterio 4: el tipo `TechniqueSelection` no admite una lista). Errores como tipos + factories en `domain/errors.ts` (`TechniqueNotSelectable`, `TechniqueNotAvailable`, DOM-006), sin clases. Prueba: `domain/__tests__/technique-selection.test.ts`.
- Capa `application/`: puertos `CatalogPort` y `ClientHistoryPort` (`ports.ts`). `catalog-adapter.ts` implementa `CatalogPort` contra el contrato público de `catalog` (`listTechniques`/`getTechnique`, nunca su tabla — ARCH-005). `select-technique.ts` orquesta: consulta el catálogo (criterio 1), decide primera vez/re-aplicación (criterio 2, ver más abajo) y aplica la política de duración del dominio. Prueba: `application/__tests__/select-technique.test.ts` con fakes como funciones factory (`__tests__/fakes.ts`), sin clases.
- Criterio 2, diferido: `application/no-appointment-history.ts` implementa `ClientHistoryPort` siempre reportando "sin historial" — no existe `scheduling_appointments` todavía (la trae `US-AGE-05`, que depende de esta historia). La corrección manual ya está resuelta en el use-case: `isFirstTimeOverride` en `SelectTechniqueInput` gana sobre la detección automática. Prueba del stub: `application/__tests__/no-appointment-history.test.ts`.
- Capa `ui/`: `load-technique-selection-page.ts` concentra toda la lógica de la página (sesión de clienta vía `getAuthSession`/`AUTH_ROLES.CLIENTE`, y la llamada a `listTechniques` del catálogo — criterio 1 de punta a punta), con su propio test (`ui/__tests__/load-technique-selection-page.test.ts`, mocks de `@/features/auth` y `@/features/catalog`). `TechniqueSelectionPageView.tsx` es puramente presentacional — decide forbidden/vacío/selector a partir de esos datos ya cargados, sin fetch ni sesión propios; prueba: `ui/__tests__/TechniqueSelectionPageView.test.tsx`. `ClientTechniqueSelectionPage.tsx` solo orquesta: llama al loader y delega el render a la vista. `TechniqueSelector.tsx` (client) es solo render; su estado vive en el hook `ui/hooks/useTechniqueSelector.ts` (`useActionState`). Los nombres de campo y valores del formulario están en `ui/constants.ts`, compartidos con `actions.ts` (`selectTechniqueAction`), que resuelve el `clientId` desde la sesión del servidor, nunca del formulario (SEC-005). Texto externalizado en `ui/messages.ts` (DOM-009).
- Entry points y ruta: `index.ts` expone `ClientTechniqueSelectionPage` y `schedulingMessages`; `client.ts` expone solo `schedulingMessages` para `loading.tsx`/`error.tsx` de la ruta (ARCH-003, sin `next/headers` en el bundle cliente). `src/app/portal/citas/page.tsx` compone la página; `loading.tsx`/`error.tsx` usan estilos de `citas.styles.ts`, con `role="status"`/`role="alert"` (UI-004). Esa ruta era un placeholder de `auth`; ahora la compone `scheduling` (ver nota en `auth/SPEC.md`).

`US-AGE-09` en progreso. Lo que existe hoy:

- **Modelo y no-solape** (migración `supabase/migrations/20261014000000_scheduling_model_and_no_overlap.sql`): `scheduling_resources` (con el recurso único `00000000-0000-0000-0000-000000000a01`, ADR-0005) y `scheduling_appointments` con `occupied_range`, siete estados y el exclusion constraint `scheduling_appointments_no_overlap` sobre `resource_id` y `occupied_range`, solo para `pending_approval`, `approved` y `confirmed` (DOM-010, ADR-0002). CHECKs: el rango es acotado, `[)` y cubre el servicio completo. RLS solo para staff; sin DELETE. Pruebas: `supabase/tests/database/scheduling_no_overlap.test.sql` (criterios 1 a 3) y `__tests__/rls-isolation.test.ts` (SEC-002).
- **Rango ocupado** (`domain/appointment-window.ts`): `computeAppointmentWindow` calcula `[inicio - preparación, fin + limpieza)` en milisegundos UTC, sin construir `Date` (DOM-004), y devuelve `InvalidAppointmentWindow` ante entradas inválidas. Es el único lugar que calcula el rango (ADR-0002). Todo el `buffer_min` del catálogo cuenta como limpieza posterior, igual que en `selectTechnique`. Prueba: `domain/__tests__/appointment-window.test.ts`.
- **Creación serializada** (migración `20261014000001_scheduling_create_appointment_fn.sql`): `scheduling_create_appointment`, `SECURITY INVOKER`, toma un `pg_advisory_xact_lock` por recurso y recién inserta. El `INSERT` directo deadlockeaba con reservas solapadas simultáneas (N=10: 8 s, más que el `statement_timeout`); con la función, N=10 tarda ~27 ms sin `40P01`. El constraint sigue siendo la garantía; el lock solo ordena (ver el addendum de ADR-0002). Prueba: `supabase/tests/database/scheduling_create_appointment.test.sql`.
- **Crear cita** (`application/create-appointment.ts`, `db/appointment-repository.ts`): calcula el rango en el dominio y llama a la función SQL sin check previo. El código `23P01` se mapea a `SpaceNotAvailable` y emite el evento estructurado `scheduling.appointment_overlap_rejected` (criterio 5, parte de código); cualquier otro fallo de la base devuelve `StorageFailed`. Pruebas: `application/__tests__/create-appointment.test.ts` y `db/__tests__/appointment-repository.test.ts`.
- **Prueba de concurrencia** (criterio 4, `db/__tests__/appointment-concurrency.integration.test.ts`): 10 reservas simultáneas por ronda, 3 rondas, contra Supabase local por la ruta completa; exactamente una gana y el resto recibe `SpaceNotAvailable`. Usa `pg` (devDependency) solo para promover a staff a una usuaria de prueba y limpiar, y se niega a correr contra un host que no sea local. Verificada por mutación: sin el constraint las 10 tienen éxito y la prueba cae. El uso de `pg` sobre `auth_user_roles` (tabla de `auth`) se acepta solo en pruebas de integración contra Supabase local.
- **Aprobar y rechazar en la base** (ADR-0003, migración `20261014000002_scheduling_appointment_decision.sql`): agrega `decided_by`, `decided_at` y `decision_reason` (máximo 500 caracteres); la política de INSERT exige cita pendiente y sin decisión; la de UPDATE es solo para staff (de `pending_approval` a `approved` o `rejected`) y el UPDATE de `authenticated` se limita a `status` y `decision_reason`. Un trigger fija `decided_by` (`auth.uid()`) y `decided_at` en cada cambio de estado: quién decide nunca viene de un parámetro (SEC-005). La función `scheduling_decide_appointment` (`SECURITY INVOKER`) no devuelve fila si la cita no existe o ya no estaba pendiente. Rechazar saca la cita del constraint y libera el espacio. Prueba: `supabase/tests/database/scheduling_decide_appointment.test.sql`. Nada aprueba ni rechaza solo (DOM-012).
- **Casos de uso de la decisión** (`application/decide-appointment.ts`): `approveAppointment` y `rejectAppointment` (motivo opcional, normalizado en `domain/appointment-decision.ts`) sobre el puerto `AppointmentDecisionRepository`, que implementa `db/appointment-decision-repository.ts`; el puerto no recibe actor. Rechazar deja el evento `scheduling.appointment.rejected` en `audit` (inyectado como `RecordAuditEvent`); si la bitácora falla devuelve `AuditNotRecorded` (la decisión ya quedó guardada). Los fallos de almacenamiento devuelven `StorageFailed`; ningún caso de uso ni repositorio lanza. Pruebas: `application/__tests__/decide-appointment.test.ts` y `db/__tests__/appointment-decision-repository.test.ts`.
- **Acciones del servidor** (`ui/approval-queue/actions/approval-queue-actions.ts`): `listPendingAppointmentsAction`, `approveAppointmentAction` y `rejectAppointmentAction` exigen `requireAdminSession`, cablean los casos de uso con el cliente de servidor y la bitácora de `audit`, toman el actor de la sesión (SEC-005) y refrescan `/admin/citas`. Solo orquestan: el mensaje de cada error sale de `ui/approval-queue/utils/decision-error-message.ts`. Si solo falla la bitácora devuelven un mensaje propio (la cita sí quedó rechazada) y refrescan igual. La lectura de pendientes está en `application/list-pending-appointments.ts` y `db/pending-appointments-repository.ts` (con la sesión de quien llama: la RLS decide). Prueba: `ui/approval-queue/__tests__/approval-queue-actions.test.ts`.
- **Cola de aprobación** (`src/app/admin/citas/page.tsx` y `ui/approval-queue/{actions,components,constants,hooks,styles,types,utils}`): la página lista las citas pendientes con `listPendingAppointmentsAction` y las pinta con `ApprovalQueue`; `loading.tsx` cubre la carga; el estado vacío y el de error (`loadError` con `role="alert"` y reintento) los resuelve `ApprovalQueue` (UI-003). `ApprovalQueue` y `ApprovalQueueItem` solo renderizan; el estado y los handlers están en `hooks/useApprovalQueue.ts`. Cada cita muestra su horario en la hora del estudio (`America/Costa_Rica`) con botones Aprobar y Rechazar con nombre accesible propio; rechazar abre un campo de motivo opcional con etiqueta (máximo 500 caracteres); un fallo se muestra con `role="alert"`. No hay `error.tsx` propio para `/admin/citas`. Prueba: `ui/approval-queue/__tests__/ApprovalQueue.test.tsx`.

Dónde se detiene: criterio 2 no se puede demostrar completo hasta que `US-AGE-05` aporte el historial real de citas — no se marca `terminada` hasta cerrarlo.

## Modelo de datos: lo porta US-AGE-09

Decisión comunicada por Bayron el 2026-10-14, con visto bueno del PO. `DEPENDENCIES.md` decía que `scheduling_appointments` la traía US-AGE-05, pero US-AGE-05 depende de US-AGE-09 y el constraint de no-solape no puede vivir sin su tabla. Por eso US-AGE-09 crea el modelo mínimo que fijan ADR-0002 y ADR-0005: `scheduling_resources` con un recurso sembrado, y `scheduling_appointments` con `resource_id`, `occupied_range` y estados. US-AGE-05 lo extiende (anticipo, precio congelado, vínculo con la clienta) sin rehacerlo.

## Criterio trasladado a US-AGE-05

Propuesto por el revisor (Kenny) y aprobado por el PO el 2026-10-15, comunicado por Bayron. Se registra en `docs/process/DEPENDENCIES.md`, Criterios trasladados, ítem 4.

- Criterio 5 de US-AGE-09 («alerta si el constraint se activa en producción»): la alerta real no se implementó aquí. No hay herramienta de alertas en el repo y, hasta que US-AGE-05 agregue el check de disponibilidad previo a la reserva, un rechazo del constraint es lo esperado y no un bug. US-AGE-09 entrega el error tipado `SpaceNotAvailable` y el evento estructurado `scheduling.appointment_overlap_rejected` (`db/appointment-repository.ts`); US-AGE-05 debe demostrar la alerta sobre ese evento y elegir el canal.

## Criterios recibidos de US-AGE-13

Traslado aprobado por el PO, comunicado por Bayron el 2026-10-03 y registrado en `docs/process/DEPENDENCIES.md`. Estos requisitos se añaden al alcance de las historias de destino; ambas conservan su estado `no_iniciada` en esta rama.

### US-AGE-05 — reservar

- Criterio original 2 de US-AGE-13: mostrar el monto del anticipo antes de confirmar la cita, junto con la advertencia de que se pierde si la clienta cancela fuera de la ventana permitida o si no asiste.
- Criterio original 3 de US-AGE-13: almacenar en la cita el anticipo requerido y el efectivamente registrado, sin recalcularlos a partir del catálogo actual (DOM-002).
- Evidencia pendiente: pruebas del aviso antes de confirmar y del snapshot de ambos montos, verificando que un cambio posterior en el catálogo no modifica la cita.

### US-AGE-12 — cerrar

- Criterio original 4 de US-AGE-13: descontar el anticipo del saldo pendiente al cerrar la cita, de modo que el pago final sea la diferencia.
- Evidencia pendiente: prueba del saldo final y del asiento del anticipo en el ledger de `payments` (DOM-005).

## Contrato público (`index.ts`, ARCH-003)

- `ClientTechniqueSelectionPage` — compone la ruta `/portal/citas`. Consumidor: `src/app/portal/citas/page.tsx`.
- `schedulingMessages` — también en `client.ts` para `loading.tsx`/`error.tsx`.
- `ApprovalQueue`, `listPendingAppointmentsAction` y `APPROVAL_QUEUE_LABELS` — componen `/admin/citas`. Consumidor: `src/app/admin/citas/page.tsx`. No están en `client.ts`.
- Dominio y aplicación (`selectTechnique`, puertos) son superficie interna: ninguna otra feature los consume todavía.
