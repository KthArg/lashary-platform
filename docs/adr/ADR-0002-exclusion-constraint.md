# ADR-0002 — No-solape de citas por exclusion constraint en PostgreSQL

> **Estado:** aceptado. **Fecha:** 2026-08-27. **Decisores:** PO + bootstrap. **Reglas:** DOM-010, DOM-011.

## Contexto

Dos clientas en el mismo espacio es la peor falla posible del sistema: presencial, visible, inarreglable en el momento. La ventana de carrera entre "ver disponible" y "confirmar" es de milisegundos y se abre en hora pico — no aparecerá en desarrollo ni en QA manual. Supabase es PostgreSQL, así que `btree_gist` está disponible. Con ADR-0003, una reserva pendiente de aprobación también debe ocupar su espacio (si no, se duplica mientras espera).

## Decisión

La no-superposición la garantiza la base de datos, no el código:

```sql
create extension if not exists btree_gist;

-- occupied_range = [inicio - preparación, fin + limpieza)  (DOM-010: incluye tiempo no facturable)
alter table scheduling_appointments
  add constraint scheduling_appointments_no_overlap
  exclude using gist (
    resource_id      with =,          -- ADR-0005: recurso explícito
    occupied_range   with &&
  )
  where (status in ('pending_approval', 'approved', 'confirmed'));
```

- `occupied_range` es `tstzrange` (UTC, DOM-003) e incluye preparación y limpieza.
- El `where` limita a estados activos: una cita `cancelled`, `rejected`, `completed` o `no_show` libera el espacio sin borrarse.
- Los nombres exactos de estados los fija la historia portadora del modelo de datos (ADR-0007); este ADR fija el principio: **pendiente de aprobación ocupa**.
- El check de disponibilidad en la aplicación se mantiene — como mensaje amable (SEC-001, mismo patrón). Si el constraint dispara en producción, se emite **alerta**: los datos se protegieron, pero la validación previa tiene un bug.
- Reagendar es una sola transacción que actualiza el rango: el constraint valida el nuevo espacio y la atomicidad garantiza DOM-011 (nunca cero citas).
- **US-AGE-09 no está terminada** sin la prueba automatizada de N reservas concurrentes al mismo espacio donde exactamente una gana.

## Alternativas consideradas

- **Check-then-insert en la aplicación:** la carrera queda abierta; prohibido por DOM-010.
- **Lock pesimista (SELECT … FOR UPDATE sobre el día):** serializa todas las reservas del día, complica el código y sigue dependiendo de que nadie olvide tomar el lock. El constraint no se puede olvidar.
- **Advisory locks:** mismas debilidades, más oscuro de operar.
- **Cola única de escritura:** infraestructura desproporcionada para un estudio.

## Consecuencias

- La garantía es estructural: ningún endpoint nuevo, script o bug puede duplicar una cita.
- Toda inserción/movimiento de cita debe poblar `occupied_range` correctamente — se centraliza en el dominio de `scheduling`, único lugar que calcula el rango (preparación + duración + limpieza).
- El constraint no sabe de reglas de negocio (ventanas, morosidad): esas siguen en la aplicación. Aquí solo vive el invariante físico: un recurso, un instante, una cita.
