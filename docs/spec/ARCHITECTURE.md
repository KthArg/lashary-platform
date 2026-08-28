# Arquitectura — reglas ARCH y DOM

> **Autoridad:** estructura del repositorio, fronteras entre features y reglas de correctitud de dominio. **Lectores:** todo el equipo antes de escribir código; skills de IA. **Estado:** vigente. **Actualizado:** 2026-08-27.
> Índice máquina: [rules.yaml](rules.yaml). Decisiones con contexto: [../adr/](../adr/).

## Forma del sistema

Next.js (App Router) + Supabase (PostgreSQL, Auth, RLS, Storage) + Tailwind/DaisyUI. CMS propio externo, repo aparte, consumido por API ([ADR-0001](../adr/ADR-0001-external-cms.md)). Deploy en Vercel; CI en GitHub Actions.

Cada feature es una rebanada vertical en `src/features/<nombre>/`:

```
src/features/scheduling/
├── SPEC.md          ← verdad de la feature (ver STATE.md)
├── index.ts         ← ÚNICO entry point público
├── domain/          ← entidades, invariantes, eventos. Cero imports de otras features
├── application/     ← use cases; orquesta domain + puertos
├── http/  ui/       ← borde: validación, mapeo de errores, componentes
└── db/              ← queries a SUS tablas (prefijo scheduling_)
```

Features: `platform`, `audit`, `auth`, `content`, `landing`, `catalog`, `scheduling`, `payments`, `clients`, `delinquency`, `loyalty`, `notifications`, `account`, `store`. Mapa historia↔feature en cada `SPEC.md`; fases en [../ROADMAP.md](../ROADMAP.md).

---

## Reglas de estructura (ARCH)

### ARCH-001 — Un solo repositorio
**Regla.** La aplicación y su capa de datos viven en este repositorio. La única excepción es el CMS externo, un producto con ciclo de deploy propio ([ADR-0001](../adr/ADR-0001-external-cms.md)).
**Racional.** Separar frontend de backend reintroduce la deriva de contratos que estas reglas existen para impedir: cada feature exigiría dos PRs coordinados y ningún CI podría verificar que spec, contrato y ambas implementaciones concuerdan.
**Cumplimiento.** L5 humano (decisión estructural; violarla requiere ADR).

### ARCH-002 — Features verticales por dominio
**Regla.** Toda funcionalidad vive completa dentro de `src/features/<nombre>/`. Los nombres salen de los dominios del negocio (epics del backlog), nunca del rol de usuario. Los epics 6 y 7 del backlog (Reservations-Admin / Reservations-Client) son un solo dominio: `scheduling`.
**Racional.** Organizar por rol produce capas horizontales con disfraz vertical: un cambio de dominio toca todas las carpetas — el patrón de conflicto que evitamos.
**Cumplimiento.** L1 script de estructura (F4) + L5 review.

### ARCH-003 — Imports solo por entry point
**Regla.** Una feature importa de otra únicamente vía su `index.ts` público. Import a rutas internas ajenas (`features/x/domain/...`) prohibido.
**Racional.** Sin esta frontera todo acoplamiento es legal y ninguna feature puede refactorizarse por dentro sin romper vecinos.
**Cumplimiento.** L3 ESLint `no-restricted-imports` + L1 script (F4).

### ARCH-004 — Domain no importa de otras features
**Regla.** `domain/` no importa nada de ninguna otra feature — ni siquiera su entry point. Solo `shared/` y su propia feature.
**Racional.** Si el corazón del dominio depende de otra feature, la rebanada vertical es ficción y el orden de merge se vuelve un grafo.
**Cumplimiento.** L3 ESLint, regla más estricta por carpeta.

### ARCH-005 — Comunicación entre features
**Regla.** Cross-feature: primero un evento de dominio; segundo, llamada al use-case público. Nunca una query directa contra tablas de otra feature.
**Racional.** Una query a tabla ajena acopla al esquema privado de otra feature y se rompe con su próxima migración, en silencio.
**Cumplimiento.** L1 script de prefijos por feature en `db/` (F4) + L5 review.

### ARCH-006 — Tablas con dueño y prefijo
**Regla.** Cada tabla pertenece a exactamente una feature y lleva su prefijo: `scheduling_appointments`, `payments_ledger_entries`, `clients_records`.
**Racional.** Sin dueño visible cualquiera escribe en cualquier tabla y nadie responde por el esquema.
**Cumplimiento.** L1 lint de migraciones (F4).

### ARCH-007 — shared/ sin reglas de negocio
**Regla.** `shared/` contiene solo lo que no tiene reglas de negocio: `Money`, `Result`, reloj, logger, config. Cualquier cosa con una regla del estudio pertenece a una feature.
**Racional.** Con una sola regla de negocio admitida, `shared` se vuelve el basurero común en dos sprints.
**Cumplimiento.** L4 skills + L5 review.

---

## Reglas de dominio (DOM)

### DOM-001 — Dinero entero en value object
**Regla.** Todo monto es un entero de colones (CRC, exponente 0 — [ADR-0004](../adr/ADR-0004-money-and-time.md)) dentro del value object `Money`. `number` flotante para dinero, prohibido; columnas `float`/`real`/`double precision` para montos, prohibidas.
**Racional.** Los floats pierden centavos en silencio; un tipo que no admite float hace el bug irrepresentable en vez de improbable.
**Cumplimiento.** L3 tipo `Money` + L1 lint de migraciones (F4).

### DOM-002 — Precios congelados en la cita
**Regla.** Al confirmar una cita, precio, anticipo requerido, promoción aplicada y reglas de fidelidad vigentes quedan **copiados** en la cita. Cambiar el catálogo jamás altera una cita o cargo existente. Cubre US-AGE-08, US-AGE-13, US-PROM-01, US-LAND-06.
**Racional.** Un precio recalculado desde el catálogo actual reescribe la historia económica del negocio.
**Cumplimiento.** L1 test obligatorio de la feature (F4) + L5 review.

### DOM-003 — Tiempo en UTC
**Regla.** Todo instante se persiste en UTC como `timestamptz`. Conversión a `America/Costa_Rica` solo en display.
**Racional.** Mezclar zonas en almacenamiento produce citas corridas una hora dos veces al año, descubiertas por una clienta plantada.
**Cumplimiento.** L1 lint de migraciones: columna `timestamp` sin zona = error (F4).

### DOM-004 — Reloj inyectado en dominio
**Regla.** `new Date()` y `Date.now()` prohibidos dentro de `domain/` y `application/`. El reloj se inyecta (`Clock` en `shared/`).
**Racional.** Sin reloj inyectable, el agendamiento es intesteable: no se puede simular "mañana" ni "48 horas antes".
**Cumplimiento.** L1 grep en CI + L3 ESLint (F4).

### DOM-005 — Ledger append-only, saldos derivados
**Regla.** El saldo de una clienta se **calcula** sumando asientos (cargos y pagos); nunca es una columna que se actualiza. El ledger es append-only: correcciones son contra-asientos, jamás `UPDATE` o `DELETE`.
**Racional.** Un saldo editable a mano es un saldo en el que nadie puede confiar; un ledger inmutable es su propia auditoría.
**Cumplimiento.** L3 sin políticas de UPDATE/DELETE sobre el ledger + L1 lint de migraciones (F4).

### DOM-006 — Errores tipados, mapeo único
**Regla.** Un `DomainError` base con subtipos específicos. Nada lanza strings ni errores pelados desde domain o application. Resultados de negocio **esperados** (espacio ocupado, morosidad activa) se retornan como valores (`Result`), no se lanzan. El mapeo a HTTP status ocurre en exactamente un lugar. Sin catch silencioso.
**Racional.** Errores sin tipo obligan a adivinar por mensaje; el catch silencioso convierte bugs en misterios sin stack trace.
**Cumplimiento.** L4 skills + L5 review.

### DOM-007 — Validación una vez en el borde
**Regla.** Formato se valida una vez, en el borde, con Zod. Hacia adentro los datos se asumen válidos. Invariantes de negocio (no formatos) viven en constructores de entidades: una entidad inválida no puede existir.
**Racional.** Validación repetida diverge entre copias; el invariante en el constructor elimina la clase entera de "entidad a medio armar".
**Cumplimiento.** L4 skills + L5 review.

### DOM-008 — Uploads validados por contenido
**Regla.** Todo archivo subido (comprobantes, imágenes de expediente) se valida server-side sobre su contenido real (magic bytes, tamaño, dimensiones), nunca sobre la extensión.
**Racional.** La extensión la elige quien sube el archivo; el contenido no.
**Cumplimiento.** L1 test por endpoint de upload (F4) + L5 review.

### DOM-009 — Texto de UI externalizado
**Regla.** Todo texto visible vive en archivos de mensajes desde el primer commit, aun con un solo idioma.
**Racional.** Extraer strings sobre una UI terminada cuesta un orden de magnitud más que hacerlo al escribir.
**Cumplimiento.** L1 lint de literales en JSX (F4).

### DOM-010 — No-solape garantizado en la base
**Regla.** La no-superposición de citas la garantiza un exclusion constraint PostgreSQL sobre `tstzrange` con `btree_gist`, scoped a estados activos y por recurso — DDL real en [ADR-0002](../adr/ADR-0002-exclusion-constraint.md). Check-then-insert como garantía, prohibido. El rango ocupado incluye preparación y limpieza. La historia US-AGE-09 no está terminada sin la prueba de N reservas simultáneas donde exactamente una gana. Una violación del constraint en producción dispara alerta: los datos se protegieron, pero la validación de la app tiene un bug.
**Racional.** Dos clientas en el mismo espacio es la peor falla posible: presencial, visible, inarreglable en el momento. La ventana de carrera es de milisegundos y solo se abre en hora pico — jamás aparecerá en desarrollo ni QA manual.
**Cumplimiento.** L3 constraint + L1 test de concurrencia en CI (F4).

### DOM-011 — Reagendado atómico
**Regla.** Reagendar libera el espacio viejo y toma el nuevo en una sola transacción. La clienta no puede quedar sin ninguno de los dos.
**Racional.** Dos operaciones separadas fallan por la mitad exactamente cuando más importa.
**Cumplimiento.** L1 test de la feature (F4) + L5 review.

### DOM-012 — Consecuencias automáticas aprobadas por el PO
**Regla.** Ninguna consecuencia automática contra una clienta (bloqueo por morosidad, pérdida de anticipo) se activa sin estar escrita en el spec de la feature y aprobada por el PO. La morosidad además exige: periodo de gracia configurable, aviso previo a la administradora con opción de confirmar o descartar, y override manual auditado (US-MOR-01, US-MOR-05).
**Racional.** Un cargo nace de un cierre manual: un olvido humano puede bloquear a una clienta que sí pagó, y ella lo descubre al intentar reservar.
**Cumplimiento.** L5 PO + review.
