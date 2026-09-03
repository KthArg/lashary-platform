---
feature: catalog
dri: pendiente
estado: en_progreso
actualizado: 2026-09-01
historias:
  - id: US-AGE-08
    estado: en_progreso
    falta: "criterios 7b y 8 (la cita no se altera / precio congelado) se demuestran en US-AGE-05 con el test obligatorio de DOM-002"
  - id: US-PROD-01
    estado: no_iniciada
  - id: US-PROM-01
    estado: no_iniciada
  - id: US-PROM-02
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# catalog

Lo que se vende: técnicas con tiempos y precios, paquetes, promociones. Precio y anticipo se congelan en la cita (DOM-002).

## Qué hace hoy

US-AGE-08 sobre la rama `feat/us-age-08-catalog` (base: `feat/f0-platform-scaffold`).

**Depende de `auth` (US-AUTH-01):** usa `getAuthSession` / `requireAdminSession` del entry point de auth y las políticas de escritura leen `public.auth_user_roles`. En aislamiento esta rama no compila (`@/features/auth`) ni `supabase db reset` corre (`auth_user_roles` no existe); rebasa sobre `auth` mergeada antes del PR (INT-005).

- Migración `supabase/migrations/20260902000000_catalog_techniques.sql`: enum `catalog_service_family` (8 familias), tabla `catalog_techniques` con los checks de DOM-001 (dinero entero) y D10 (retoque coherente), índice parcial `idx_catalog_techniques_family_active` (PERF-003), trigger `catalog_set_updated_at`.
- Migración `supabase/migrations/20260902000001_catalog_write_policies.sql`: `public.auth_is_staff()` (`SECURITY DEFINER`, `search_path=''`, provisional acá hasta que la exponga `auth`) + políticas `catalog_techniques_{insert,update,delete}_staff`.
- RLS (SEC-001): lectura pública para `anon` y `authenticated`; `INSERT/UPDATE/DELETE` solo cuando `public.auth_is_staff()` confirma rol `admin`/`superadmin`. `rls-isolation.test.ts` verifica que anón y clienta autenticada no pueden escribir; el control positivo (staff sí puede) se cubre en la integración de auth / US-AGE-05.
- Seed `supabase/seed.sql`: una técnica por familia. Prueba `src/features/catalog/__tests__/seed.integration.test.ts` (criterio 2).
- Capa `domain/`: entidad `Technique` con constructor validado (`Technique.create` → `Result`), invariantes DOM-007 y D10; `deactivate()`, `toView()` y `snapshot()`. Errores `CatalogError` / `TechniqueValidationError` / `TechniqueNotFound` (DOM-006). Prueba `domain/__tests__/technique.test.ts`.
- Capa `application/`: puerto `TechniqueRepository`; use-cases `listTechniques` / `getTechnique` (`queries.ts`, paginado PERF-002, tope 100) y `createTechnique` / `updateTechnique` / `deactivateTechnique` (`commands.ts`, id inyectado). Pruebas con repositorio en memoria (`__tests__/queries.test.ts`, `commands.test.ts`).
- Capa `db/`: `SupabaseTechniqueRepository` (mapea fila ↔ dominio, `Money` en los bordes). Prueba de integración `db/__tests__/technique-repository.integration.test.ts` verifica lectura + paginación contra el seed y que `save()` con token anónimo es rechazado por RLS.
- `index.ts` (ARCH-003): `listTechniques(query?)` y `getTechnique(id)` — cablean el repositorio de servidor y devuelven `TechniqueView` / `Result<…, TechniqueNotFound>`. Exporta `ServiceFamily`, `TechniqueView`, `TechniqueSnapshot`, `SERVICE_FAMILIES`, `TechniqueNotFound`, `AdminCatalogPage`, `catalogMessages`. `create` / `update` / `deactivate` **no** se exportan. Prueba `__tests__/public-api.integration.test.ts` (read path completo contra Supabase local).
- `client.ts` (ARCH-003): segundo entry point, solo `catalogMessages`, sin nada que dependa de `next/headers`. Lo usan los boundaries de ruta que corren en el cliente (`loading.tsx`, `error.tsx`) para no arrastrar código de servidor al bundle.
- Capa `ui/` + ruta `src/app/admin/catalog/`: `AdminCatalogPage` (server) lista las técnicas (`TechniqueTable`, DaisyUI, UI-001/002) con estado vacío + `loading.tsx` + `error.tsx` (UI-003, a11y UI-004), ambos importando texto de `client.ts`, no de `ui/messages` directo; `TechniqueForm` (client, `useActionState`) crea/edita/desactiva. El `layout.tsx` de la ruta exige staff con `requireAdminSession()` (redirige a `/admin`); los server actions chequean `isStaff()` (`require-staff.ts` → `getAuthSession`) para el mensaje amable — RLS conserva la autorización real (SEC-001). Validación **Zod** en el borde (`schema.ts`, DOM-007), texto externalizado en `messages.ts` (DOM-009). Pruebas `ui/__tests__/schema.test.ts`, `ui/__tests__/actions.test.ts`, `src/app/admin/catalog/layout.test.tsx`.
- Test de aislamiento RLS `__tests__/rls-isolation.test.ts` (SEC-002): con token anónimo y con el token de una clienta autenticada real (sign-up, sin service-role key) verifica que `SELECT` funciona (lectura pública intencional) y que cada `INSERT` / `UPDATE` / `DELETE` falla y no altera los datos ni el conteo. El `beforeAll` falla ruidosamente si el seed no está cargado (sin falsos verdes). CI (`job-tests-reales`) levanta Supabase local + `db reset` antes de `npm test`; `supabase` CLI pinneada en `devDependencies`.

Dónde se detiene: los criterios 7b y 8 (la cita no se altera / precio congelado) se cierran en US-AGE-05. El camino admin ya funciona para staff (RLS + `requireAdminSession`); falta rebasar sobre `auth` para que compile en aislamiento.

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
- Escritura: políticas `catalog_techniques_*_staff` para `INSERT/UPDATE/DELETE`, condicionadas por `public.auth_is_staff()`. Anónimos y usuarios `cliente` permanecen fail-closed.

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
- **Auth es canónica en su propia rama** (US-AUTH-01/02). Esta rama consume su contrato (`getAuthSession`, `requireAdminSession`, `auth_user_roles`) y aporta `public.auth_is_staff()` de forma provisional en su migración forward, hasta que `auth` la exponga.
- Sin ADR: el congelamiento de precio ya lo fija DOM-002; el resto son decisiones locales de la feature.

## Flags

Ninguno. `catalog_admin_write` se retiró al integrar `public.auth_is_staff()` y las políticas RLS de escritura.
