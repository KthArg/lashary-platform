---
feature: catalog
dri: pendiente
estado: en_progreso
actualizado: 2026-09-22
historias:
  - id: US-AGE-08
    estado: terminada
    evidencia: "PR #7, PR #50, tests: seed.integration.test.ts, technique.test.ts, queries.test.ts, commands.test.ts, actions.test.ts, schema.test.ts, technique-repository.integration.test.ts, public-api.integration.test.ts, rls-isolation.test.ts, layout.test.tsx"
  - id: US-PROD-01
    estado: en_progreso
    falta: "probar a mano /admin/catalog/packages en un navegador (crear un paquete, ver la suma de duracion en vivo, desactivarlo); el codigo esta completo y sus pruebas corren en verde, incluidas package-repository.integration.test.ts y package-rls-isolation.test.ts contra Supabase local en CI (job pruebas (vitest) de los PR de la pila). Cierra como terminada con el PR de us/US-PROD-01 a main"
  - id: US-PROM-01
    estado: no_iniciada
  - id: US-PROM-02
    estado: no_iniciada
flags: []
deuda:
  - que: "Control positivo de escritura como staff contra la base real: ninguna prueba demuestra que una sesion con rol admin o superadmin puede INSERT, UPDATE y DELETE en catalog_techniques (politicas catalog_techniques_*_staff de supabase/migrations/20260902000001_catalog_write_policies.sql); rls-isolation.test.ts solo cubre el control negativo y actions.test.ts usa repositorio en memoria"
    aceptada_en: "PR de cierre de US-AGE-08 (docs/us-age-08-close-out)"
    costo: "2h: prueba SQL local que siembra el rol como superusuario, fija request.jwt.claims y comprueba las tres escrituras con rollback; mas el arnes de Supabase local si aun no corre en el entorno de quien la escribe"
  - que: "El mismo hueco de control positivo aplica a catalog_packages y catalog_package_techniques (politicas catalog_packages_*_staff y catalog_package_techniques_*_staff de supabase/migrations/20260922000001_catalog_package_write_policies.sql): package-rls-isolation.test.ts cubre solo el control negativo (anonimo y clienta no pueden escribir) y package-actions.test.ts usa repositorios mockeados. Sembrar el rol staff exige escribir en auth_user_roles saltandose RLS, es decir la service-role key, que SEC-003 prohibe poner al alcance de un agente"
    aceptada_en: "PR de politicas RLS de paquetes (US-PROD-01, pieza 6)"
    costo: "0h adicionales si se resuelve junto con la deuda de catalog_techniques: es el mismo arnes de sesion staff, cubre las tres tablas a la vez"
defectos: []
---

# catalog

Lo que se vende: técnicas con tiempos y precios, paquetes, promociones. Precio y anticipo se congelan en la cita (DOM-002).

## Qué hace hoy

US-AGE-08 terminada: PR #7 (catálogo, lectura y RLS) y PR #50 (escritura de administradora con `public.auth_is_staff()` y políticas RLS).

**Depende de `auth` (US-AUTH-01, `terminada`):** usa `getAuthSession` / `requireAdminSession` del entry point de auth y las políticas de escritura leen `public.auth_user_roles`.

- Migración `supabase/migrations/20260902000000_catalog_techniques.sql`: enum `catalog_service_family` (8 familias), tabla `catalog_techniques` con los checks de DOM-001 (dinero entero) y D10 (retoque coherente), índice parcial `idx_catalog_techniques_family_active` (PERF-003), trigger `catalog_set_updated_at`.
- Migración `supabase/migrations/20260902000001_catalog_write_policies.sql`: `public.auth_is_staff()` (`SECURITY DEFINER`, `search_path=''`, provisional acá hasta que la exponga `auth`) + políticas `catalog_techniques_{insert,update,delete}_staff`.
- RLS (SEC-001): lectura pública para `anon` y `authenticated`; `INSERT/UPDATE/DELETE` solo cuando `public.auth_is_staff()` confirma rol `admin`/`superadmin`. `rls-isolation.test.ts` verifica que anón y clienta autenticada no pueden escribir; el control positivo (staff sí puede) no tiene prueba contra la base real: está registrado como deuda en el front-matter.
- Seed `supabase/seed.sql`: una técnica por familia. Prueba `src/features/catalog/__tests__/seed.integration.test.ts` (criterio 2).
- Capa `domain/`: entidad `Technique` con constructor validado (`Technique.create` → `Result`), invariantes DOM-007 y D10; `deactivate()`, `toView()` y `snapshot()`. Errores `CatalogError` / `TechniqueValidationError` / `TechniqueNotFound` / `TechniqueNameConflict` (DOM-006). Prueba `domain/__tests__/technique.test.ts`.
- Capa `application/`: puerto `TechniqueRepository`; use-cases `listTechniques` / `getTechnique` (`queries.ts`, paginado PERF-002, tope 100) y `createTechnique` / `updateTechnique` / `deactivateTechnique` (`commands.ts`, id inyectado). `saveOrConflict` atrapa `TechniqueNameConflict` (violación de `catalog_techniques_name_unique`) y lo convierte a `Result` — antes llegaba como `Error` genérico sin tipar hasta el server action (DOM-006). Pruebas con repositorio en memoria (`__tests__/queries.test.ts`, `commands.test.ts`, incluye el caso de nombre duplicado).
- Capa `db/`: `SupabaseTechniqueRepository` (mapea fila ↔ dominio, `Money` en los bordes). `save()` distingue `23505` (unique_violation) y lanza `TechniqueNameConflict`; cualquier otro error de Supabase sigue siendo una falla de infra genuina. Prueba de integración `db/__tests__/technique-repository.integration.test.ts` verifica lectura + paginación contra el seed y que `save()` con token anónimo es rechazado por RLS.
- `index.ts` (ARCH-003): `listTechniques(query?)` y `getTechnique(id)` — cablean el repositorio de servidor y devuelven `TechniqueView` / `Result<…, TechniqueNotFound>`. Exporta `ServiceFamily`, `TechniqueView`, `TechniqueSnapshot`, `SERVICE_FAMILIES`, `TechniqueNotFound`, `AdminCatalogPage`, `catalogMessages`. `create` / `update` / `deactivate` **no** se exportan. Prueba `__tests__/public-api.integration.test.ts` (read path completo contra Supabase local).
- `client.ts` (ARCH-003): segundo entry point, solo `catalogMessages`, sin nada que dependa de `next/headers`. Lo usan los boundaries de ruta que corren en el cliente (`loading.tsx`, `error.tsx`) para no arrastrar código de servidor al bundle.
- Capa `ui/` + ruta `src/app/admin/catalog/`: `AdminCatalogPage` (server) lista las técnicas (`TechniqueTable`, DaisyUI, UI-001/002) con estado vacío + `loading.tsx` + `error.tsx` (UI-003, a11y UI-004), ambos importando texto de `client.ts`, no de `ui/messages` directo; `TechniqueForm` (client, `useActionState`) crea/edita/desactiva. El `layout.tsx` de la ruta exige staff con `requireAdminSession()` (redirige a `/admin`); los server actions chequean `isStaff()` (`require-staff.ts` → `getAuthSession`) para el mensaje amable — RLS conserva la autorización real (SEC-001). Validación **Zod** en el borde (`schema.ts`, DOM-007), texto externalizado en `messages.ts` (DOM-009). Pruebas `ui/__tests__/schema.test.ts`, `ui/__tests__/actions.test.ts`, `src/app/admin/catalog/layout.test.tsx`.
- Test de aislamiento RLS `__tests__/rls-isolation.test.ts` (SEC-002): con token anónimo y con el token de una clienta autenticada real (sign-up, sin service-role key) verifica que `SELECT` funciona (lectura pública intencional) y que cada `INSERT` / `UPDATE` / `DELETE` falla y no altera los datos ni el conteo. El `beforeAll` falla ruidosamente si el seed no está cargado (sin falsos verdes). CI (`job-tests-reales`) levanta Supabase local + `db reset` antes de `npm test`; `supabase` CLI pinneada en `devDependencies`.

Dónde se detiene: los criterios 7b y 8 (la cita no se altera / precio congelado) se trasladaron a US-AGE-05 (ver `docs/process/DEPENDENCIES.md`, «Criterios trasladados»). El camino admin usa RLS + `requireAdminSession`; su control positivo contra la base real es la deuda registrada arriba.

**US-PROD-01 (en_progreso):** migración `supabase/migrations/20260922000000_catalog_packages.sql` (tablas `catalog_packages` y `catalog_package_techniques`, RLS de solo lectura pública por ahora — la escritura llega en una migración aparte) y entidad `domain/package.ts` (`Package.create` valida mínimo dos técnicas sin duplicados y precio > 0, DOM-007; `deactivate()` no borra, criterio 3). Puerto `PackageRepository` (`application/ports.ts`) y casos de uso `listPackages`/`getPackage` (`application/queries.ts`, paginado PERF-002) que exponen `durationTotalMin` — la duración no vive en el dominio, la calcula el repositorio uniendo las técnicas miembro en una sola query (PERF-005, criterio 2). `createPackage`/`updatePackage`/`deactivatePackage` (`application/commands.ts`) validan que las técnicas del paquete existan y estén activas con una sola consulta por lote (`TechniqueRepository.findByIds`, agregado también a `db/technique-repository.ts`; PERF-005, sin queries en loop). `db/package-repository.ts` (`SupabasePackageRepository`) reconstruye el dominio con un solo join a `catalog_package_techniques`/`catalog_techniques` (PERF-005) y calcula `durationTotalMin` ahí; `save()` actualiza el paquete y reemplaza sus filas puente en llamadas secuenciales, no en una transacción SQL (DOM-011 no aplica: no es reagendado de citas). Seed de ejemplo en `supabase/seed.sql` (un paquete con dos técnicas). Migración `20260922000001_catalog_package_write_policies.sql` agrega políticas `catalog_packages_*_staff` y `catalog_package_techniques_*_staff` (reusa `public.auth_is_staff()`). Test de aislamiento `__tests__/package-rls-isolation.test.ts` (SEC-002) cubre lectura pública y escritura denegada a anónimo y a clienta sin rol de staff en ambas tablas. `ui/package-actions.ts` (`createPackageAction`/`updatePackageAction`/`deactivatePackageAction`, mismo patrón `isStaff → Zod → comando → revalidatePath` que técnicas) y `ui/package-schema.ts` (Zod; el checklist de técnicas llega por `formData.getAll('techniqueIds')`, no `Object.fromEntries`, porque un mismo nombre trae varios valores). `AdminPackagesPage` + `PackageTable` listan los paquetes con sus técnicas (por nombre, resueltas con `listTechniques`), duración total y precio; ruta `src/app/admin/catalog/packages/` (`page.tsx`/`loading.tsx`/`error.tsx`, reusa el layout y `catalog.styles.ts` de la ruta padre) con link de navegación Técnicas/Paquetes en `layout.tsx`. `ui/package-form.tsx` (Client, `useActionState`) crea/edita/desactiva: checklist de técnicas activas con duración por técnica visible y suma total recalculada en vivo (criterio 2, mismo cómputo que `db/package-repository.ts`), precio como campo independiente ajustable a mano. Cableado en `AdminPackagesPage` vía `?new`/`?edit`, igual patrón que técnicas. `index.ts` (ARCH-003) expone `listPackages(query?)` y `getPackage(id)` — la superficie de solo lectura, cableada con el repositorio de servidor — más `PackageListItem`, `PackageNotFound`, `ListPackagesQuery` y `AdminPackagesPage`. `createPackage`/`updatePackage`/`deactivatePackage` **no** se exportan, igual que con técnicas. Contrato y garantías en [docs/contracts/catalog-api.md](../../../docs/contracts/catalog-api.md), sección "Paquetes".

Dónde se detiene US-PROD-01: el código está completo y probado. Las pruebas unitarias (dominio, application con repositorios en memoria, schema y server actions con repositorios mockeados) corren en cualquier entorno; `db/__tests__/package-repository.integration.test.ts` (3 pruebas, incluida la duración total de 190 min del paquete del seed) y `__tests__/package-rls-isolation.test.ts` (5 pruebas, SEC-002) corren contra Supabase local en el job `pruebas (vitest)` de CI y pasan — en la máquina donde se escribieron se saltan por falta de Docker, no por estar rotas. Queda pendiente probar la UI a mano en un navegador; la historia pasa a `terminada` con el PR de `us/US-PROD-01` a `main` como evidencia (EST-005).

## Qué no hace todavía

- **Criterio 7b / 8** (una técnica desactivada o con precio cambiado no altera citas ya agendadas): trasladados a US-AGE-05, que trae la tabla de citas. El catálogo cumple su parte — no borra técnicas (solo `is_active = false`) y expone `TechniqueSnapshot` — y el congelamiento se prueba en US-AGE-05 con el test obligatorio de DOM-002.
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
