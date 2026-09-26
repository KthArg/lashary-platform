---
feature: scheduling
dri: pendiente
estado: en_progreso
actualizado: "2026-09-25"
historias:
  - id: US-AGE-01
    estado: en_progreso
    falta: "Piezas 2/3 (días no laborables y feriados) y 3/3 (bloqueo manual puntual), y el panel administrativo (UI) con su wiring en src/app. El criterio 'reducir disponibilidad no elimina citas ya agendadas' queda diferido: depende de scheduling_appointments, que no existe hasta US-AGE-05."
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
  - que: "Test de aislamiento RLS (scheduling_weekly_availability) contra instancia local de Supabase en CI — mismo patrón aceptado en auth (PR #3)"
    aceptada_en: "US-AGE-01, pieza 1/3 (disponibilidad semanal)"
    costo: "2h"
  - que: "Ningún bloque semanal de disponibilidad valida que no se superponga con otro del mismo día — ni en el constructor de WeeklyAvailabilityBlock, ni en defineWeeklyAvailability, ni en la migración (sin EXCLUDE). Es posible definir lunes 09:00-13:00 y lunes 12:00-18:00 a la vez."
    aceptada_en: "US-AGE-01, pieza 1/3 (disponibilidad semanal)"
    costo: "1h"
defectos: []
---

# scheduling

Agenda completa. US-AGE-09 cubre el flujo de aprobación manual (su texto original, ADR-0003) Y el constraint de no-solape (sus criterios, ADR-0002); recurso explícito (ADR-0005). Agendar en nombre de una clienta: cláusula de US-MOR-02 (ADR-0007).

## Qué hace hoy

En progreso `US-AGE-01`, primer incremento (disponibilidad semanal; sin panel administrativo todavía):
- Modelo de recurso explícito (ADR-0005): tabla `scheduling_resources`, sembrada con un único recurso ("Dueña").
- Bloques de disponibilidad semanal por recurso (`scheduling_weekly_availability`): día de la semana + rango horario. El invariante `end_time > start_time` se valida en el constructor del dominio (DOM-007), comparando minutos desde medianoche y no texto crudo (`"9:00"` se rechaza por formato en vez de compararse mal), y en la base (`CHECK`).
- RLS (SEC-001): lectura pública en ambas tablas (el calendario público de `US-AGE-02` la necesita sin sesión); escritura solo `admin`/`superadmin` vía `public.auth_is_admin()` (ARCH-005: scheduling no consulta `auth_user_roles` directamente).
- Errores de dominio tipados (`SchedulingError` extiende `DomainError`, con `code` estable — DOM-006).
- Casos de uso puros en `application/` (`defineWeeklyAvailability`, `listWeeklyAvailability`, `listResources`) contra un puerto `SchedulingRepository`; implementación Supabase en `db/`.
- Pruebas unitarias de dominio y de casos de uso (con repositorio falso, sin Supabase): `availability.test.ts`, `manage-availability.test.ts`.

Siguientes incrementos de la misma historia (sin dependencia entre sí): días no laborables/feriados, bloqueo manual puntual, panel administrativo.

## Contrato público (`src/features/scheduling/index.ts`)

Punto de entrada (ARCH-003): `WeeklyAvailabilityBlock`, `DAYS_OF_WEEK`/`DayOfWeek`, `Resource`, sus errores tipados (`SchedulingError`, `InvalidTimeRangeError`, `InvalidDayOfWeekError`), `defineWeeklyAvailability`/`listWeeklyAvailability`/`listResources`, el puerto `SchedulingRepository` y `supabaseSchedulingRepository`.

## Invariantes

- Todo bloque semanal exige `end_time > start_time` (comparado en minutos, no como texto) — validado en el constructor del dominio, no solo en la base.
- Toda escritura en `scheduling_weekly_availability` pasa por RLS con rol `admin`/`superadmin` (`SEC-001`); ninguna ruta de aplicación es la frontera real de autorización.
- Sin Google Calendar ni ninguna integración con calendario externo: fuera de alcance de esta historia (ninguna de las 51 historias del backlog lo pide; ADR-0007 no admite alcance nuevo sin decisión del PO).
