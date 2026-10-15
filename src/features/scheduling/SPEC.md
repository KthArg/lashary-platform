---
feature: scheduling
dri: pendiente
estado: en_progreso
actualizado: "2026-10-14"
historias:
  - id: US-AGE-01
    estado: terminada
    evidencia: "PR de cierre us/US-AGE-01 a main, con las piezas 1 a 12 apiladas hacia la rama de la historia. Criterios 1, 2 y 3 demostrados en /admin/citas; los criterios 4 y 5 se trasladaron a US-AGE-02 y US-AGE-05 con aprobación del PO el 2026-10-14 (docs/process/DEPENDENCIES.md); tests: weekly-availability.test.ts (domain y application), closed-dates.test.ts (domain y application), manual-blocks.test.ts (domain y application), los tres *-repository.test.ts, studio-time.test.ts, availability-schema.test.ts, availability-actions.test.ts, availability-format.test.ts, AdminAvailabilityView.test.tsx, __tests__/rls-isolation.test.ts (SEC-002) y pgTAP scheduling_weekly_availability.test.sql y scheduling_closed_dates_and_manual_blocks.test.sql"
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
    estado: no_iniciada
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

Dónde se detiene: criterio 2 no se puede demostrar completo hasta que `US-AGE-05` aporte el historial real de citas — no se marca `terminada` hasta cerrarlo.

### US-AGE-01 — disponibilidad

Criterios 1 a 3 en `/admin/citas`, solo para staff. Todo sobre el recurso por defecto `DEFAULT_RESOURCE_ID` (`application/availability-ports.ts`), el que siembra la migración de US-AGE-09 (`20261014000000_scheduling_model_and_no_overlap.sql`); la UI no muestra selector (ADR-0005).

- Base: `scheduling_weekly_availability`, `scheduling_closed_dates` y `scheduling_manual_blocks`, en una sola migración (`20261015000000_scheduling_availability.sql`) que se apoya en `scheduling_resources` y `btree_gist` de US-AGE-09. RLS solo staff en lectura y escritura (SEC-001). No-solape garantizado por exclusion constraint en bloques semanales y bloqueos; un cierre por día por UNIQUE. Pruebas: pgTAP `scheduling_weekly_availability.test.sql` y `scheduling_closed_dates_and_manual_blocks.test.sql` (control positivo de staff), `__tests__/rls-isolation.test.ts` (SEC-002).
- Criterio 1, bloques semanales: horas de pared del estudio en minutos desde la medianoche, día ISO 1–7 (`domain/weekly-availability.ts`). `application/weekly-availability.ts` rechaza el solape nombrando el bloque en conflicto antes de escribir.
- Criterio 2, días cerrados: fecha de calendario del estudio, no laborable o feriado, con nombre opcional (`domain/closed-dates.ts`, `application/closed-dates.ts`). El panel lista desde hoy.
- Criterio 3, bloqueos manuales: instantes en UTC (DOM-003), motivo opcional que solo ve staff (`domain/manual-blocks.ts`, `application/manual-blocks.ts`). Desbloquear, elegir varios espacios y el conflicto con citas quedan para US-AGE-07.
- `shared/studio-time.ts` convierte entre la hora de pared de `America/Costa_Rica` y UTC sin leer el reloj (DOM-004).
- UI: `ui/availability/`. Validación de formato una vez en el borde con zod (`availability-schema.ts`, DOM-007); acciones del servidor en `availability-actions.ts`, que revisan el rol para dar un mensaje amable; composición en `availability-service.ts`; fechas formateadas en el servidor en la zona del estudio (`availability-format.ts`). `loading.tsx` y `error.tsx` de la ruta cubren carga y error; cada lista tiene su vacío (UI-003).

Alcance: los criterios 4 y 5 se trasladaron con aprobación del PO el 2026-10-14 (ver la sección siguiente y `docs/process/DEPENDENCIES.md`, Criterios trasladados). US-AGE-01 queda `terminada` con los criterios 1 a 3.

## Criterios recibidos de US-AGE-01

Traslado aprobado por el PO el 2026-10-14 y registrado en `docs/process/DEPENDENCIES.md`. Ambas historias de destino siguen `no_iniciada`.

### US-AGE-02 — calendario de la clienta

- Criterio 4 de US-AGE-01: los cambios de disponibilidad se reflejan inmediatamente en el calendario. La lectura no se cachea y nunca expone el motivo de un bloqueo: hoy las cuatro tablas de disponibilidad son solo de staff (SEC-001), así que US-AGE-02 agrega su vía de lectura.
- Evidencia pendiente: prueba de que un cambio en `/admin/citas` se ve en la siguiente lectura del calendario, y de que el motivo de un bloqueo no llega a la clienta.

### US-AGE-05 — reservar

- Criterio 5 de US-AGE-01: reducir la disponibilidad no elimina citas ya agendadas. Al quitar un bloque semanal, cerrar un día o bloquear un espacio que afecte citas existentes, el panel advierte y pide confirmación.
- Evidencia pendiente: pruebas de las tres acciones de `ui/availability/availability-actions.ts` con una cita afectada, que verifican la advertencia y que la cita sigue existiendo.

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
- `AdminAvailabilityPage` — compone la ruta `/admin/citas`. Consumidor: `src/app/admin/citas/page.tsx`.
- `schedulingMessages` — también en `client.ts` para `loading.tsx`/`error.tsx`.
- Dominio y aplicación (`selectTechnique`, puertos) son superficie interna: ninguna otra feature los consume todavía.
