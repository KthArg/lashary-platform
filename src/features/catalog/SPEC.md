---
feature: catalog
dri: pendiente
estado: en_progreso
actualizado: 2026-09-01
historias:
  - id: US-AGE-08
    estado: en_progreso
    falta: "criterios 7b y 8 (la cita no se altera / precio congelado) se demuestran en US-AGE-05 con el test obligatorio de DOM-002; el camino de escritura admin va apagado tras el flag catalog_admin_write hasta que auth exponga public.auth_is_staff()"
  - id: US-PROD-01
    estado: no_iniciada
  - id: US-PROM-01
    estado: no_iniciada
  - id: US-PROM-02
    estado: no_iniciada
flags:
  - nombre: catalog_admin_write
    estado: apagado
    dueno: Bayron Alpizar
    retiro: 2026-12-01
deuda: []
defectos: []
---

# catalog

Lo que se vende: técnicas con tiempos y precios, paquetes, promociones. Precio y anticipo se congelan en la cita (DOM-002).

## Qué hace hoy

US-AGE-08 en progreso sobre la rama `feat/us-age-08-catalog` (base: `feat/f0-platform-scaffold`).

Construido y verificado contra Supabase local (`supabase db reset`):

- Migración `supabase/migrations/20260902000000_catalog_techniques.sql`: enum `catalog_service_family` (8 familias), tabla `catalog_techniques` con los checks de DOM-001 (dinero entero) y D10 (retoque coherente), índice parcial `idx_catalog_techniques_family_active` (PERF-003), trigger `catalog_set_updated_at`.
- RLS (SEC-001): política `catalog_techniques_select_all` de lectura para `anon` y `authenticated`; sin política de escritura → INSERT/UPDATE/DELETE denegados por la base (B1, fail-closed). Verificado: anón `SELECT` → 8 filas, anón `INSERT` → 401, anón `UPDATE` → 0 filas afectadas.
- Seed `supabase/seed.sql`: una técnica por familia. Prueba `src/features/catalog/__tests__/seed.integration.test.ts` (criterio 2).
- Capa `domain/`: entidad `Technique` con constructor validado (`Technique.create` → `Result`), invariantes DOM-007 y D10; `deactivate()`, `toView()` y `snapshot()`. Errores `CatalogError` / `TechniqueValidationError` / `TechniqueNotFound` (DOM-006). Prueba `domain/__tests__/technique.test.ts`.
- Capa `application/`: puerto `TechniqueRepository`; use-cases `listTechniques` / `getTechnique` (`queries.ts`, paginado PERF-002, tope 100) y `createTechnique` / `updateTechnique` / `deactivateTechnique` (`commands.ts`, id inyectado). Pruebas con repositorio en memoria (`__tests__/queries.test.ts`, `commands.test.ts`).
- Capa `db/`: `SupabaseTechniqueRepository` (mapea fila ↔ dominio, `Money` en los bordes). Prueba de integración `db/__tests__/technique-repository.integration.test.ts` verifica lectura + paginación contra el seed y que `save()` con token anónimo es rechazado por RLS.
- `index.ts` (ARCH-003): `listTechniques(query?)` y `getTechnique(id)` — cablean el repositorio de servidor y devuelven `TechniqueView` / `Result<…, TechniqueNotFound>`. Exporta `ServiceFamily`, `TechniqueView`, `TechniqueSnapshot`, `SERVICE_FAMILIES`, `TechniqueNotFound`, `AdminCatalogPage`, `catalogMessages`. `create` / `update` / `deactivate` **no** se exportan. Prueba `__tests__/public-api.integration.test.ts` (read path completo contra Supabase local).
- Capa `ui/` + ruta `src/app/admin/catalog/`: `AdminCatalogPage` (server) lista las técnicas (`TechniqueTable`, DaisyUI, UI-001/002) con estado vacío + `loading.tsx` + `error.tsx` (UI-003, a11y UI-004); `TechniqueForm` (client, `useActionState`) crea/edita/desactiva. Server actions `actions.ts` con validación **Zod** en el borde (`schema.ts`, DOM-007). Texto externalizado en `messages.ts` (DOM-009). Flag `catalog_admin_write` en `flags.ts`: apagado → los actions devuelven el mensaje de "escritura deshabilitada" en vez de chocar con RLS. Pruebas `ui/__tests__/schema.test.ts`, `ui/__tests__/actions.test.ts`.

Dónde se detiene: falta el test de aislamiento RLS formal (incremento 7). La escritura desde la app queda **deshabilitada por el flag** y **denegada por RLS** — el mapeo de escritura de `db/` no se verifica contra la base real hasta que `auth` exponga `public.auth_is_staff()`; hoy solo se ejercita con el repositorio en memoria. El flag `catalog_admin_write` cubre esa brecha.

## Qué no hace todavía

- **Criterio 7b / 8** (una técnica desactivada o con precio cambiado no altera citas ya agendadas): no hay tabla de citas (US-AGE-05, `no_iniciada`). El catálogo cumple su parte — no borra técnicas (solo `is_active = false`) y expone `TechniqueSnapshot` — pero el congelamiento se prueba en US-AGE-05 con el test obligatorio de DOM-002.
- Consumo de `buffer_min` en el calendario: US-AGE-02.
- Consumo de `reapplication_interval_days` en recordatorios: US-NOT-05.
- Paquetes (US-PROD-01) y promociones (US-PROM-01/02).

## Modelo de datos

`catalog_techniques` (prefijo `catalog_`, ARCH-006). Sin FK a otras tablas: la cita hará snapshot, no referencia viva (DOM-002).

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text NOT NULL UNIQUE | nombre visible |
| `family` | `catalog_service_family` NOT NULL | 8 familias (ver Decisiones) |
| `price_first_time` | bigint NOT NULL `> 0` | colones enteros, CRC (DOM-001 / ADR-0004) |
| `price_retouch` | bigint NULL `> 0` | null = la técnica no ofrece retoque |
| `duration_first_time_min` | integer NOT NULL `> 0` | minutos |
| `duration_retouch_min` | integer NULL `> 0` | minutos; acoplada a `price_retouch` (ambas o ninguna) |
| `buffer_min` | integer NOT NULL DEFAULT 0 `>= 0` | preparación + limpieza; ocupa calendario, no se cobra (criterio 4) |
| `reapplication_interval_days` | integer NULL `> 0` | intervalo sugerido; null = no aplica |
| `deposit` | bigint NOT NULL `>= 0` | anticipo requerido, colones enteros (DOM-001); 0 = sin anticipo |
| `aftercare_text` | text NOT NULL, no vacío | texto de cuidados posteriores (criterio 6) |
| `is_active` | boolean NOT NULL DEFAULT true | criterio 7a: `listTechniques({ activeOnly })` filtra por esto |
| `created_at` / `updated_at` | timestamptz NOT NULL | UTC (DOM-003); `updated_at` por trigger `set_updated_at` |

Índice parcial `idx_catalog_techniques_family_active` sobre `(family) WHERE is_active` (PERF-003).

### RLS (SEC-001)

- `catalog_techniques_select_all` — `SELECT` para `anon` y `authenticated`, `USING (true)`. El catálogo es público (lo consume US-LAND-02).
- Escritura: **sin política** → RLS la deniega para todo rol que no sea el dueño de la tabla / `service_role`. Es la postura B1 (fail-closed) mientras `auth` no exista en esta rama. Cuando `auth` mergee `public.auth_is_staff()`, una migración forward agrega `INSERT/UPDATE/DELETE` con `WITH CHECK (public.auth_is_staff())` y se retira el flag `catalog_admin_write`.

## Contrato público (`index.ts`, ARCH-003)

Detalle y garantías: [docs/contracts/catalog-api.md](../../../docs/contracts/catalog-api.md).

- `listTechniques({ activeOnly?, page?, pageSize? })` → página de `TechniqueView`. Paginado server-side (PERF-002). Lo consumen US-LAND-02 y US-AGE-03.
- `getTechnique(id)` → `TechniqueView | TechniqueNotFound`. US-AGE-05 toma el `TechniqueSnapshot` de aquí al confirmar la cita (DOM-002).
- Tipos: `TechniqueView`, `ServiceFamily`, `TechniqueSnapshot`. La entidad de dominio `Technique` (usa `Money`) no cruza la frontera.
- `create` / `update` / `deactivate` **no se exportan**: son admin, se usan por server action dentro de `catalog/ui/`.

## Decisiones

- **D1 — Familias como enum plano de 8 valores** (`lash_classic`, `lash_volume`, `lash_extra_volume`, `brow_design`, `brow_lamination`, `henna`, `waxing`, `lips`). El criterio 2 las enumera como una sola lista; el volumen de pestañas va dentro del valor, no como columna aparte. A escala de un estudio, agrupar "todas las de pestañas" es un filtro `family LIKE 'lash\_%'`, no una tabla de lookup.
- **D2 / D3 — Retoque e intervalo de re-aplicación son opcionales.** No toda técnica tiene retoque (henna, depilación, lipstick) ni intervalo sugerido.
- **D5 — `aftercare_text` obligatorio y no vacío.** El criterio 6 dice "cada técnica define su texto de cuidados".
- **D10 — `price_retouch` y `duration_retouch_min` van juntas o ninguna.** Un retoque necesita precio y duración; lo valida el constructor de `Technique`.
- Sin ADR: el congelamiento de precio ya lo fija DOM-002; el resto son decisiones locales de la feature.

## Flags

- `catalog_admin_write` — apagado. Dueño: Bayron Alpizar. Retiro: 2026-12-01 (o antes, al mergear `auth` con `public.auth_is_staff()`). Cubre: la escritura de `catalog_techniques` desde la app, hoy denegada por RLS por falta de la función de rol.
