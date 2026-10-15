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
    estado: en_progreso
    falta: "notificar a la clienta al rechazar (depende de US-NOT-*) y el cierre de la historia. Criterio 5: la alerta real no existe porque no hay herramienta de alertas en el repo; solo se entrega el error tipado y el evento estructurado scheduling.appointment_overlap_rejected (db/appointment-repository.ts). Ya existen el modelo y el constraint (migración 20261014000000), el cálculo del rango ocupado (domain/appointment-window.ts), la función de creación serializada (migración 20261014000001), la creación de cita, la prueba de concurrencia (criterio 4), la decisión de aprobar o rechazar en la base (migración 20261014000002), sus casos de uso con bitácora, las server actions de la cola y la cola de aprobación en `/admin/citas`."
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

`US-AGE-09` en progreso. Pieza 10/10 (limpieza): se quitaron los comentarios innecesarios del código y las pruebas de las piezas 4 a 7, a pedido del revisor; sin cambio de comportamiento (la suite completa pasa igual). Pieza 9/9 (cola de aprobación en el panel): `src/app/admin/citas/page.tsx` (antes un placeholder) lista las citas pendientes con `listPendingAppointmentsAction` y las pinta con `ApprovalQueue`; `loading.tsx` cubre la carga; el estado vacío y el de error (`loadError` con `role="alert"` y reintento) los resuelve `ApprovalQueue` (UI-003). La UI vive en `ui/approval-queue/{actions,components,constants,hooks,styles,types,utils}`: `ApprovalQueue` y `ApprovalQueueItem` solo renderizan, el estado y los handlers están en `hooks/useApprovalQueue.ts`, los textos en `constants/approval-queue.labels.ts` y los estilos en `styles/approval-queue.styles.ts` (importados como `STYLES`). Cada cita muestra su horario en la hora del estudio (`America/Costa_Rica`, no UTC) con botones Aprobar y Rechazar con nombre accesible propio; rechazar abre un campo de motivo opcional con etiqueta (máximo 500 caracteres); un fallo se muestra con `role="alert"`. `index.ts` exporta `ApprovalQueue`, `listPendingAppointmentsAction` y las etiquetas; `client.ts` exporta las etiquetas para `error.tsx` (ARCH-003). Pruebas: `ui/approval-queue/__tests__/ApprovalQueue.test.tsx`. Pieza 8/9 (acciones de la cola de aprobación; la pila pasó de 8 a 9 piezas al partir la UI): `application/list-pending-appointments.ts` y `db/pending-appointments-repository.ts` leen las citas en `pending_approval` por orden de inicio (con la sesión de quien llama: la RLS decide). Las server actions de `ui/approval-queue/actions/approval-queue-actions.ts` (`listPendingAppointmentsAction`, `approveAppointmentAction`, `rejectAppointmentAction`) exigen `requireAdminSession`, cablean los casos de uso con el cliente de servidor y la bitácora de `audit` (por su entry point), toman el actor de la sesión (SEC-005) y refrescan `/admin/citas`. Si solo falla la bitácora, devuelven un mensaje propio (la cita sí quedó rechazada) y refrescan igual. Prueba: `ui/approval-queue/__tests__/approval-queue-actions.test.ts`. Pieza 6/8 (aprobar y rechazar en la base, ADR-0003): la migración `supabase/migrations/20261014000002_scheduling_appointment_decision.sql` agrega `decided_by`, `decided_at` y `decision_reason` (máximo 500 caracteres), una política de INSERT que exige cita pendiente y sin decisión (una cita nueva nunca nace aprobada ni con `decided_by` falso), una política de UPDATE solo para staff (desde `pending_approval` hacia `approved` o `rejected`) y limita el UPDATE de `authenticated` a `status` y `decision_reason`, así el horario, el rango ocupado y quién decidió no se editan. Un trigger fija `decided_by` (`auth.uid()`) y `decided_at` cada vez que cambia el estado, también ante un UPDATE directo que se salte la función: quién decide nunca viene de un parámetro (SEC-005). La función `scheduling_decide_appointment` (`SECURITY INVOKER`) cambia estado y motivo, y no devuelve fila si la cita no existe o ya no estaba pendiente. Rechazar saca la cita del constraint y libera el espacio. Pieza 7/8 (casos de uso): `application/decide-appointment.ts` con `approveAppointment` y `rejectAppointment` (motivo opcional, normalizado en `domain/appointment-decision.ts`) sobre el puerto `AppointmentDecisionRepository`, que implementa `db/appointment-decision-repository.ts` llamando a la función SQL; el puerto no recibe actor. El rechazo deja el evento `scheduling.appointment.rejected` en `audit` (por su entry point, inyectado como `RecordAuditEvent`) y, si la bitácora falla, el error se propaga. Pruebas: `application/__tests__/decide-appointment.test.ts` y `db/__tests__/appointment-decision-repository.test.ts`. Nada aprueba ni rechaza solo (DOM-012). Prueba de la pieza 6/8: `supabase/tests/database/scheduling_decide_appointment.test.sql`; en `scheduling_no_overlap.test.sql` la aserción de UPDATE ahora espera que la política bloquee estados distintos de aprobada o rechazada. La prueba de concurrencia (pieza 5/8) promueve a staff con `pg` sobre `auth_user_roles`, una tabla de `auth`; se acepta solo en pruebas de integración contra Supabase local (el patrón de las pruebas de `catalog` lo evitaba) y queda dicho aquí. Pieza 3/8 (función de creación): la migración `supabase/migrations/20261014000001_scheduling_create_appointment_fn.sql` agrega `scheduling_create_appointment`, `SECURITY INVOKER`, que toma un `pg_advisory_xact_lock` por recurso y recién inserta. El `INSERT` directo deadlockeaba con reservas solapadas simultáneas (N=2: 1 s y `40P01` la mitad de las veces; N=10: 8 s, más que el `statement_timeout`); con la función, N=10 tarda ~27 ms sin `40P01`. El constraint sigue siendo la garantía (DOM-010); el lock solo ordena. Ver el addendum de ADR-0002. Prueba: `supabase/tests/database/scheduling_create_appointment.test.sql`. Pieza 4/8 (creación de cita): `application/create-appointment.ts` calcula el rango en el dominio y delega al puerto `AppointmentRepository`; `db/appointment-repository.ts` llama a la función SQL sin check previo (DOM-010): `23P01` se mapea a `SpaceNotAvailable` y emite el evento estructurado `scheduling.appointment_overlap_rejected` (criterio 5, parte de código); cualquier otro error lanza. Pruebas: `application/__tests__/create-appointment.test.ts` y `db/__tests__/appointment-repository.test.ts`. Pieza 5/8 (concurrencia): `db/__tests__/appointment-concurrency.integration.test.ts`, la prueba obligatoria del criterio 4: 10 reservas simultáneas por ronda, 3 rondas, contra Supabase local por la ruta completa (caso de uso, repositorio, PostgREST, función, constraint); exactamente una gana y el resto recibe `SpaceNotAvailable`. Usa `pg` (devDependency) solo para promover a staff a una usuaria de prueba y limpiar, y se niega a correr contra un host que no sea local. Verificada por mutación: sin el constraint las 10 tienen éxito y la prueba cae. Estable en 15 corridas completas seguidas de `npm test`. Pieza 2/8 (rango ocupado, `domain/appointment-window.ts`): función pura `computeAppointmentWindow` que calcula `[inicio - preparación, fin + limpieza)` en milisegundos UTC (sin construir `Date`, DOM-004) y devuelve error tipado `InvalidAppointmentWindow` ante entradas inválidas; es el único lugar que calcula el rango (ADR-0002). `bufferAsCleanup` cuenta todo el `buffer_min` del catálogo (un solo valor de "preparación + limpieza") como limpieza posterior, coherente con `selectTechnique`. `domain/errors.ts` suma `SpaceNotAvailable` y su guarda `isSpaceNotAvailable` para el mapeo del constraint (pieza 3). Prueba: `domain/__tests__/appointment-window.test.ts`. Pieza 1/8 (modelo y constraint): la migración `supabase/migrations/20261014000000_scheduling_model_and_no_overlap.sql` crea `scheduling_resources` (con el recurso único `00000000-0000-0000-0000-000000000a01`, ADR-0005) y `scheduling_appointments` con `occupied_range`, siete estados y el exclusion constraint `scheduling_appointments_no_overlap` sobre `resource_id` y `occupied_range`, solo para `pending_approval`, `approved` y `confirmed` (DOM-010, ADR-0002). CHECKs: el rango es acotado, `[)` y cubre el servicio completo. RLS solo para staff (SELECT en ambas tablas, INSERT en citas); sin DELETE: una cita no se borra. Pruebas: `supabase/tests/database/scheduling_no_overlap.test.sql` (criterios 1 a 3) y `__tests__/rls-isolation.test.ts` (SEC-002).

Dónde se detiene: criterio 2 no se puede demostrar completo hasta que `US-AGE-05` aporte el historial real de citas — no se marca `terminada` hasta cerrarlo.

## Modelo de datos: lo porta US-AGE-09

Decisión comunicada por Bayron el 2026-10-14, con visto bueno del PO. `DEPENDENCIES.md` decía que `scheduling_appointments` la traía US-AGE-05, pero US-AGE-05 depende de US-AGE-09 y el constraint de no-solape no puede vivir sin su tabla. Por eso US-AGE-09 crea el modelo mínimo que fijan ADR-0002 y ADR-0005: `scheduling_resources` con un recurso sembrado, y `scheduling_appointments` con `resource_id`, `occupied_range` y estados. US-AGE-05 lo extiende (anticipo, precio congelado, vínculo con la clienta) sin rehacerlo.

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
- Dominio y aplicación (`selectTechnique`, puertos) son superficie interna: ninguna otra feature los consume todavía.
