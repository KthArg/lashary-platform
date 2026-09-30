---
feature: scheduling
dri: pendiente
estado: en_progreso
actualizado: "2026-09-25"
historias:
  - id: US-AGE-01
    estado: en_progreso
    falta: "Criterio 5 ('reducir disponibilidad no elimina citas ya agendadas: advierte y pide confirmación') diferido: depende de scheduling_appointments, que no existe hasta US-AGE-05. Criterios 1 a 4 implementados y verificados (ver 'Qué hace hoy')."
  - id: US-AGE-02
    estado: no_iniciada
  - id: US-AGE-03
    estado: no_iniciada
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
deuda:
  - que: "Ningún bloque semanal de disponibilidad valida que no se superponga con otro del mismo día — ni en el constructor de WeeklyAvailabilityBlock, ni en defineWeeklyAvailability, ni en la migración (sin EXCLUDE). Es posible definir lunes 09:00-13:00 y lunes 12:00-18:00 a la vez."
    aceptada_en: "US-AGE-01, pieza 1/3 (disponibilidad semanal)"
    costo: "1h"
  - que: "ClosedDate valida el formato YYYY-MM-DD por regex, no el calendario real: acepta fechas inexistentes como 2026-02-30 o 2026-13-01."
    aceptada_en: "US-AGE-01, pieza 2/3 (días no laborables)"
    costo: "30m"
  - que: "Las entradas del panel no se pueden editar ni eliminar: los criterios del backlog solo piden 'definir'. Un bloque, feriado o bloqueo cargado por error no se corrige desde el panel."
    aceptada_en: "US-AGE-01, panel administrativo"
    costo: "3h"
  - que: "La verificación del panel en navegador (guardar, listar, error de dominio, feriado repetido, hora de Costa Rica) se corrió a mano con Playwright contra Supabase local; no hay prueba e2e ni de componentes commiteada para los Server Actions y formularios."
    aceptada_en: "US-AGE-01, panel administrativo"
    costo: "3h"
defectos: []
---

# scheduling

Agenda completa. US-AGE-09 cubre el flujo de aprobación manual (su texto original, ADR-0003) Y el constraint de no-solape (sus criterios, ADR-0002); recurso explícito (ADR-0005). Agendar en nombre de una clienta: cláusula de US-MOR-02 (ADR-0007).

## Qué hace hoy

En progreso `US-AGE-01`: datos, casos de uso y panel administrativo en `/admin/citas`.
- Modelo de recurso explícito (ADR-0005): tabla `scheduling_resources`, sembrada con un único recurso ("Dueña"). El panel usa ese recurso sin ofrecer selector.
- Criterio 1 — bloques de disponibilidad semanal (`scheduling_weekly_availability`): día de la semana + rango horario. El invariante `end_time > start_time` se valida en el constructor del dominio (DOM-007), comparando minutos desde medianoche y no texto, y en la base (`CHECK`).
- Criterio 2 — días no laborables y feriados (`scheduling_closed_dates`): fecha por recurso, única por `(resource_id, closed_date)`; un duplicado se traduce a `ClosedDateAlreadyExistsError` y el panel lo muestra como aviso.
- Criterio 3 — bloqueo manual puntual (`scheduling_manual_blocks`): rango de instantes por recurso, `ends_at > starts_at` validado en el constructor y en la base. Solo la capacidad de datos y su alta desde el panel; la UX completa (seleccionar varios, desbloquear, impedir bloquear sobre una cita existente) es alcance de `US-AGE-07`. El panel interpreta la hora ingresada como hora de Costa Rica (UTC-6 fijo, sin horario de verano) y la guarda en UTC (DOM-003); se muestra en hora de Costa Rica.
- Criterio 4 — RLS (SEC-001): lectura pública en las cuatro tablas (el calendario público de `US-AGE-02` la necesita sin sesión); escritura solo `admin`/`superadmin` vía `public.auth_is_admin()` (ARCH-005). El calendario público en sí es `US-AGE-02`.
- Casos de uso puros en `application/` (`defineWeeklyAvailability`/`listWeeklyAvailability`, `defineClosedDate`/`listClosedDates`, `defineManualBlock`/`listManualBlocks`, `listResources`) contra un puerto `SchedulingRepository`; implementación Supabase en `db/`.
- Panel en `ui/` (`AdminSchedulingPage`): tabla y formulario por cada uno de los tres conceptos; Server Actions con Zod en el borde (DOM-007), chequeo de rol amable (`isStaff`) y captura de `SchedulingError`; textos externalizados (DOM-009). La ruta `src/app/admin/citas/page.tsx` solo lo compone y conserva `requireAdminSession()`.
- Pruebas: unitarias de dominio y casos de uso con repositorio falso (`availability.test.ts`, `manage-availability.test.ts`); mapeo de la violación UNIQUE (`supabase-scheduling-repository.test.ts`); `ui/__tests__/format.test.ts`, `ui/__tests__/parse-local-datetime.test.ts`; RLS real con pgTAP contra Postgres local en `supabase/tests/database/scheduling_rls.test.sql` (21 comprobaciones: anon, clienta, admin y superadmin sobre las tres tablas, más los `CHECK` y el `UNIQUE`; correr con `npx supabase test db`).

## Contrato público (`src/features/scheduling/index.ts`)

Punto de entrada (ARCH-003): `WeeklyAvailabilityBlock`/`ClosedDate`/`ManualBlock`, `Resource`, `DAYS_OF_WEEK`/`DayOfWeek`, sus errores tipados (`SchedulingError` y subtipos con `code`, DOM-006), `defineWeeklyAvailability`/`listWeeklyAvailability`/`defineClosedDate`/`listClosedDates`/`defineManualBlock`/`listManualBlocks`/`listResources`, el puerto `SchedulingRepository`, `supabaseSchedulingRepository` y `AdminSchedulingPage`.

## Invariantes

- Todo bloque semanal exige `end_time > start_time` (comparado en minutos, no como texto); toda fecha de cierre respeta `YYYY-MM-DD` (formato, no calendario real — ver deuda); todo bloqueo manual exige `ends_at > starts_at` — validado en el constructor del dominio, no solo en la base.
- Toda escritura en las cuatro tablas de scheduling pasa por RLS con rol `admin`/`superadmin` (`SEC-001`); ninguna ruta de aplicación es la frontera real de autorización.
- La hora que ingresa la administradora se ancla explícitamente a UTC-6 antes de construir el `Date`; no depende de la zona horaria del servidor.
- Sin Google Calendar ni ninguna integración con calendario externo: fuera de alcance de esta historia (ninguna de las 51 historias del backlog lo pide; ADR-0007 no admite alcance nuevo sin decisión del PO).

## Pendiente heredado para quien tome US-AGE-05

`US-AGE-01` quedó con un criterio sin implementar, porque depende de una tabla que todavía no existe:

> "Reducir la disponibilidad no elimina citas ya agendadas: el sistema advierte y pide confirmación si el cambio afecta citas existentes."

**Por qué falta:** comparar un cambio de disponibilidad contra citas exige `scheduling_appointments`, que crea `US-AGE-05`. Sin esa tabla no hay contra qué comparar, y una implementación "simulada" no demostraría nada (EST-005).

**Cómo cerrarlo cuando la tabla exista:**
1. Agregar al puerto `SchedulingRepository` (`application/ports.ts`) una consulta de citas activas que se solapan con un rango de un recurso.
2. Los cambios que hoy reducen disponibilidad son dos: `defineClosedDate` (un feriado) y `defineManualBlock` (un bloqueo). Antes de guardarlos, consultar las citas afectadas; si hay, devolver un resultado de negocio "requiere confirmación" con esas citas (DOM-006: un resultado esperado se retorna, no se lanza) y no persistir hasta que llegue la confirmación explícita.
3. En el panel (`ui/`), mostrar la advertencia con la lista de citas y reenviar el formulario con la confirmación. Los textos van en `ui/messages.ts` (DOM-009).
4. Si más adelante se agrega editar o eliminar bloques semanales, esos cambios también pueden reducir disponibilidad y deben pasar por la misma verificación.
5. Pruebas que lo demuestran: (a) cita existente + feriado ese día → advierte y no guarda; (b) sin citas afectadas → guarda; (c) con confirmación → guarda y la cita no se toca.

**Al terminar:** quitar el `falta` de `US-AGE-01` y pasarla a `terminada` con las pruebas nombradas. Alternativa ya usada en `catalog` con `US-AGE-08`: mover el criterio a `US-AGE-05` por decisión del PO, registrándolo en `docs/process/DEPENDENCIES.md`.

**Otras deudas de esta historia** (en el front-matter): solape de bloques semanales del mismo día, calendario real en `ClosedDate`, editar y eliminar desde el panel, y pruebas automatizadas de los formularios.
