---
feature: scheduling
dri: pendiente
estado: en_progreso
actualizado: "2026-09-17"
historias:
  - id: US-AGE-01
    estado: en_progreso
    falta: "Panel administrativo (UI) y su wiring en src/app — único incremento que falta; el criterio 'reducir disponibilidad no elimina citas ya agendadas' queda diferido — depende de scheduling_appointments, que no existe hasta US-AGE-05"
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
  - que: "Test de aislamiento RLS (scheduling_weekly_availability, scheduling_closed_dates, scheduling_manual_blocks) contra instancia local de Supabase en CI — mismo patrón aceptado en auth (PR #3)"
    aceptada_en: "PR US-AGE-01 (disponibilidad semanal)"
    costo: "2h"
defectos: []
---

# scheduling

Agenda completa. US-AGE-09 cubre el flujo de aprobación manual (su texto original, ADR-0003) Y el constraint de no-solape (sus criterios, ADR-0002); recurso explícito (ADR-0005). Agendar en nombre de una clienta: cláusula de US-MOR-02 (ADR-0007).

## Qué hace hoy

En progreso `US-AGE-01`, tres incrementos de datos completos (disponibilidad semanal + feriados + bloqueo manual; sin panel administrativo todavía):
- Modelo de recurso explícito (ADR-0005): tabla `scheduling_resources`, sembrada con un único recurso ("Dueña").
- Bloques de disponibilidad semanal por recurso (`scheduling_weekly_availability`): día de la semana + rango horario, invariante `end_time > start_time` validado en el constructor del dominio (DOM-007) y en la base (`CHECK`).
- Días no laborables y feriados (`scheduling_closed_dates`): fecha específica por recurso, formato validado en el constructor del dominio y única por `(resource_id, closed_date)` en la base.
- Bloqueo manual puntual (`scheduling_manual_blocks`): rango de instantes por recurso, invariante `ends_at > starts_at` validado en el constructor y en la base. Solo la capacidad de datos — la UX completa (seleccionar varios, desbloquear, impedir bloquear sobre una cita existente) es alcance de `US-AGE-07`.
- RLS (SEC-001): lectura pública en las cuatro tablas (el calendario público de `US-AGE-02` la necesita sin sesión); escritura solo `admin`/`superadmin`, verificado contra `auth_user_roles`.
- Casos de uso puros en `application/` (`defineWeeklyAvailability`/`listWeeklyAvailability`, `defineClosedDate`/`listClosedDates`, `defineManualBlock`/`listManualBlocks`) contra un puerto `SchedulingRepository`; implementación Supabase en `db/`.
- Pruebas unitarias de dominio y de casos de uso (con repositorio falso, sin Supabase): `availability.test.ts`, `manage-availability.test.ts`.

Único incremento que falta: panel administrativo.

## Contrato público (`src/features/scheduling/index.ts`)

Punto de entrada (ARCH-003): `WeeklyAvailabilityBlock`/`ClosedDate`/`ManualBlock` y sus errores tipados, `defineWeeklyAvailability`/`listWeeklyAvailability`/`defineClosedDate`/`listClosedDates`/`defineManualBlock`/`listManualBlocks`, el puerto `SchedulingRepository` y `supabaseSchedulingRepository`.

## Invariantes

- Todo bloque semanal exige `end_time > start_time`; toda fecha de cierre respeta `YYYY-MM-DD`; todo bloqueo manual exige `ends_at > starts_at` — validado en el constructor del dominio, no solo en la base.
- Toda escritura en las cuatro tablas de scheduling pasa por RLS con rol `admin`/`superadmin` (`SEC-001`); ninguna ruta de aplicación es la frontera real de autorización.
- Sin Google Calendar ni ninguna integración con calendario externo: fuera de alcance de esta historia (ninguna de las 51 historias del backlog lo pide; ADR-0007 no admite alcance nuevo sin decisión del PO).
