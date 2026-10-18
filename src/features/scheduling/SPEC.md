---
feature: scheduling
dri: pendiente
estado: en_progreso
actualizado: "2026-10-17"
historias:
  - id: US-AGE-01
    estado: terminada
    evidencia: "PR de cierre us/US-AGE-01 a main, con las piezas 1 a 13 apiladas hacia la rama de la historia. Criterios 1, 2 y 3 demostrados en /admin/citas/disponibilidad; los criterios 4 y 5 se trasladaron a US-AGE-02 y US-AGE-05 con aprobación del PO el 2026-10-14 (docs/process/DEPENDENCIES.md); tests: weekly-availability.test.ts (domain y application), closed-dates.test.ts (domain y application), manual-blocks.test.ts (domain y application), los tres *-repository.test.ts, studio-time.test.ts, availability-schema.test.ts, availability-actions.test.ts, availability-format.test.ts, AdminAvailabilityView.test.tsx, __tests__/availability-rls-isolation.test.ts (SEC-002) y pgTAP scheduling_weekly_availability.test.sql y scheduling_closed_dates_and_manual_blocks.test.sql"
  - id: US-AGE-02
    estado: no_iniciada
  - id: US-AGE-03
    estado: terminada
    evidencia: "criterios 1, 3 y 4 demostrados; el criterio 2 se trasladó a US-AGE-05 con aprobación del PO (líder del proyecto), comunicado por Erick Duran el 2026-10-17 (docs/process/DEPENDENCIES.md, Criterios trasladados, ítem 6); tests: technique-selection.test.ts, select-technique.test.ts, no-appointment-history.test.ts, load-technique-selection-page.test.ts, TechniqueSelectionPageView.test.tsx"
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

`US-AGE-03` terminada: primer código de la feature.

- Capa `domain/` (`technique-selection.ts`): función pura `selectTechnique(technique, isFirstTime)` — aplica la política de duración (criterio 3: duración según primera vez o retoque, más `bufferMin` del catálogo) y el invariante de una sola técnica por selección (criterio 4: el tipo `TechniqueSelection` no admite una lista). Errores como tipos + factories en `domain/errors.ts` (`TechniqueNotSelectable`, `TechniqueNotAvailable`, DOM-006), sin clases. Prueba: `domain/__tests__/technique-selection.test.ts`.
- Capa `application/`: puertos `CatalogPort` y `ClientHistoryPort` (`ports.ts`). `catalog-adapter.ts` implementa `CatalogPort` contra el contrato público de `catalog` (`listTechniques`/`getTechnique`, nunca su tabla — ARCH-005). `select-technique.ts` orquesta: consulta el catálogo (criterio 1), decide primera vez/re-aplicación (criterio 2, trasladado a US-AGE-05, ver más abajo) y aplica la política de duración del dominio. Prueba: `application/__tests__/select-technique.test.ts` con fakes como funciones factory (`__tests__/fakes.ts`), sin clases.
- Criterio 2, trasladado a US-AGE-05 (aprobado por el PO el 2026-10-17, ver más abajo): `application/no-appointment-history.ts` implementa `ClientHistoryPort` siempre reportando "sin historial" — la tabla mínima `scheduling_appointments` de US-AGE-09 no tiene `client_id` ni `technique_id`, así que no hay cómo detectar primera vez/re-aplicación por historial real todavía. La corrección manual ya está resuelta en el use-case: `isFirstTimeOverride` en `SelectTechniqueInput` gana sobre la detección automática. US-AGE-05 deberá reemplazar o extender este puerto cuando agregue el vínculo cliente↔cita. Prueba del stub: `application/__tests__/no-appointment-history.test.ts`.
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

Alcance: el criterio 2 se trasladó a US-AGE-05 con aprobación del PO el 2026-10-17 (ver "Criterios recibidos de US-AGE-03" más abajo y `docs/process/DEPENDENCIES.md`, Criterios trasladados). US-AGE-03 queda `terminada` con los criterios 1, 3 y 4.

### US-AGE-01 — disponibilidad

Criterios 1 a 3 en `/admin/citas/disponibilidad`, pestaña junto a la cola de aprobación de US-AGE-09, solo para staff. Todo sobre el recurso por defecto `DEFAULT_RESOURCE_ID` (`application/availability-ports.ts`), el que siembra la migración de US-AGE-09 (`20261014000000_scheduling_model_and_no_overlap.sql`); la UI no muestra selector (ADR-0005).

- Base: `scheduling_weekly_availability`, `scheduling_closed_dates` y `scheduling_manual_blocks`, en una sola migración (`20261015000000_scheduling_availability.sql`) que se apoya en `scheduling_resources` y `btree_gist` de US-AGE-09. RLS solo staff en lectura y escritura (SEC-001). No-solape garantizado por exclusion constraint en bloques semanales y bloqueos; un cierre por día por UNIQUE. Pruebas: pgTAP `scheduling_weekly_availability.test.sql` y `scheduling_closed_dates_and_manual_blocks.test.sql` (control positivo de staff), `__tests__/availability-rls-isolation.test.ts` (SEC-002).
- Criterio 1, bloques semanales: horas de pared del estudio en minutos desde la medianoche, día ISO 1–7 (`domain/weekly-availability.ts`). `application/weekly-availability.ts` rechaza el solape nombrando el bloque en conflicto antes de escribir.
- Criterio 2, días cerrados: fecha de calendario del estudio, no laborable o feriado, con nombre opcional (`domain/closed-dates.ts`, `application/closed-dates.ts`). El panel lista desde hoy.
- Criterio 3, bloqueos manuales: instantes en UTC (DOM-003), motivo opcional que solo ve staff (`domain/manual-blocks.ts`, `application/manual-blocks.ts`). Desbloquear, elegir varios espacios y el conflicto con citas quedan para US-AGE-07.
- `shared/studio-time.ts` convierte entre la hora de pared de `America/Costa_Rica` y UTC sin leer el reloj (DOM-004).
- UI: `ui/availability/{actions,components,services,styles,types,utils,validation}`, la misma estructura que `ui/approval-queue/`. Validación de formato una vez en el borde con zod (`validation/availability-schema.ts`, DOM-007); acciones del servidor en `actions/availability-actions.ts`, que revisan el rol para dar un mensaje amable; composición en `services/availability-service.ts`; fechas formateadas en el servidor en la zona del estudio (`utils/availability-format.ts`); componentes en `components/`. `loading.tsx` y `error.tsx` de la ruta cubren carga y error; cada lista tiene su vacío (UI-003).

Alcance: los criterios 4 y 5 se trasladaron con aprobación del PO el 2026-10-14 (ver la sección siguiente y `docs/process/DEPENDENCIES.md`, Criterios trasladados). US-AGE-01 queda `terminada` con los criterios 1 a 3.

## Criterios recibidos de US-AGE-01

Traslado aprobado por el PO el 2026-10-14 y registrado en `docs/process/DEPENDENCIES.md`. Ambas historias de destino siguen `no_iniciada`.

### US-AGE-02 — calendario de la clienta

- Criterio 4 de US-AGE-01: los cambios de disponibilidad se reflejan inmediatamente en el calendario. La lectura no se cachea y nunca expone el motivo de un bloqueo: hoy las cuatro tablas de disponibilidad son solo de staff (SEC-001), así que US-AGE-02 agrega su vía de lectura.
- Evidencia pendiente: prueba de que un cambio en `/admin/citas/disponibilidad` se ve en la siguiente lectura del calendario, y de que el motivo de un bloqueo no llega a la clienta.

### US-AGE-05 — reservar

- Criterio 5 de US-AGE-01: reducir la disponibilidad no elimina citas ya agendadas. Al quitar un bloque semanal, cerrar un día o bloquear un espacio que afecte citas existentes, el panel advierte y pide confirmación.
- Evidencia pendiente: pruebas de las tres acciones de `ui/availability/actions/availability-actions.ts` con una cita afectada, que verifican la advertencia y que la cita sigue existiendo.

## Criterios recibidos de US-AGE-13

Traslado aprobado por el PO, comunicado por Bayron el 2026-10-03 y registrado en `docs/process/DEPENDENCIES.md`. Estos requisitos se añaden al alcance de las historias de destino; ambas conservan su estado `no_iniciada` en esta rama.

### US-AGE-05 — reservar

- Criterio original 2 de US-AGE-13: mostrar el monto del anticipo antes de confirmar la cita, junto con la advertencia de que se pierde si la clienta cancela fuera de la ventana permitida o si no asiste.
- Criterio original 3 de US-AGE-13: almacenar en la cita el anticipo requerido y el efectivamente registrado, sin recalcularlos a partir del catálogo actual (DOM-002).
- Evidencia pendiente: pruebas del aviso antes de confirmar y del snapshot de ambos montos, verificando que un cambio posterior en el catálogo no modifica la cita.

### US-AGE-12 — cerrar

- Criterio original 4 de US-AGE-13: descontar el anticipo del saldo pendiente al cerrar la cita, de modo que el pago final sea la diferencia.
- Evidencia pendiente: prueba del saldo final y del asiento del anticipo en el ledger de `payments` (DOM-005).

## Criterios recibidos de US-AGE-03

Traslado aprobado por el PO (líder del proyecto), comunicado por Erick Duran el 2026-10-17 y registrado en `docs/process/DEPENDENCIES.md`. US-AGE-05 sigue `no_iniciada`.

### US-AGE-05 — reservar

- Criterio 2 de US-AGE-03: el sistema determina si es primera vez o re-aplicación según el historial del cliente, permitiendo corregirlo manualmente. Requiere el vínculo cliente↔cita que esta historia agrega sobre `scheduling_appointments` — la tabla mínima de US-AGE-09 no tiene `client_id` ni `technique_id`, por eso el puerto no se puede implementar de verdad antes de esta historia.
- Evidencia pendiente: implementación real de `ClientHistoryPort` (o su reemplazo) contra el historial de citas completadas de la clienta, y su prueba.

## Contrato público (`index.ts`, ARCH-003)

- `ClientTechniqueSelectionPage` — compone la ruta `/portal/citas`. Consumidor: `src/app/portal/citas/page.tsx`.
- `AdminAvailabilityPage` — compone la ruta `/admin/citas/disponibilidad`. Consumidor: `src/app/admin/citas/disponibilidad/page.tsx`; las pestañas de la sección están en `src/app/admin/citas/layout.tsx`.
- `schedulingMessages` — también en `client.ts` para `loading.tsx`/`error.tsx`.
- `ApprovalQueue`, `listPendingAppointmentsAction` y `APPROVAL_QUEUE_LABELS` — componen `/admin/citas`. Consumidor: `src/app/admin/citas/page.tsx`. No están en `client.ts`.
- Dominio y aplicación (`selectTechnique`, puertos) son superficie interna: ninguna otra feature los consume todavía.
