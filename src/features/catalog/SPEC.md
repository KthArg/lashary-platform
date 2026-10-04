---
feature: catalog
dri: pendiente
estado: en_progreso
actualizado: 2026-10-04
historias:
  - id: US-AGE-08
    estado: terminada
    evidencia: "PR #7, PR #50, tests: seed.integration.test.ts, technique.test.ts, queries.test.ts, commands.test.ts, actions.test.ts, schema.test.ts, technique-repository.integration.test.ts, public-api.integration.test.ts, rls-isolation.test.ts, layout.test.tsx"
  - id: US-PROD-01
    estado: terminada
    evidencia: "PRs #98 a #107, #134, #157 a #168 (pila) y el cierre us/US-PROD-01 a main; tests: package.test.ts, package-commands.test.ts, package-queries.test.ts, package-actions.test.ts, package-schema.test.ts, package-inactive-techniques.test.tsx, package-pagination.test.tsx, package-repository.integration.test.ts, package-rls-isolation.test.ts, catalog_package_staff_write.test.sql; UI probada a mano contra lashary-pruebas (2026-10-03)"
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

US-AGE-08 terminada: PR #7 (catálogo, lectura y RLS) y PR #50 (escritura de administradora con `public.auth_is_staff()` y políticas RLS).

**Depende de `auth` (US-AUTH-01, `terminada`):** usa `getAuthSession` / `requireAdminSession` del entry point de auth y las políticas de escritura leen `public.auth_user_roles`.

- Migración `supabase/migrations/20260902000000_catalog_techniques.sql`: enum `catalog_service_family` (8 familias), tabla `catalog_techniques` con los checks de DOM-001 (dinero entero) y D10 (retoque coherente), índice parcial `idx_catalog_techniques_family_active` (PERF-003), trigger `catalog_set_updated_at`.
- Migración `supabase/migrations/20260902000001_catalog_write_policies.sql`: `public.auth_is_staff()` (`SECURITY DEFINER`, `search_path=''`, provisional acá hasta que la exponga `auth`) + políticas `catalog_techniques_{insert,update,delete}_staff`.
- RLS (SEC-001): lectura pública para `anon` y `authenticated`; `INSERT/UPDATE/DELETE` solo cuando `public.auth_is_staff()` confirma rol `admin`/`superadmin`. `rls-isolation.test.ts` verifica que anón y clienta autenticada no pueden escribir; el control positivo (staff sí puede, clienta no) lo demuestra `supabase/tests/database/catalog_staff_write.test.sql` (pgTAP, `npx supabase test db`, corre en CI).
- Seed `supabase/seed.sql`: una técnica por familia. Prueba `src/features/catalog/__tests__/seed.integration.test.ts` (criterio 2).
- Capa `domain/`: entidad `Technique` con constructor validado (`Technique.create` → `Result`), invariantes DOM-007 y D10; `deactivate()`, `toView()` y `snapshot()`. Errores `CatalogError` / `TechniqueValidationError` / `TechniqueNotFound` / `TechniqueNameConflict` (DOM-006). Prueba `domain/__tests__/technique.test.ts`.
- Capa `application/`: puerto `TechniqueRepository`; use-cases `listTechniques` / `getTechnique` (`queries.ts`, paginado PERF-002, tope 100) y `createTechnique` / `updateTechnique` / `deactivateTechnique` (`commands.ts`, id inyectado). `saveOrConflict` atrapa `TechniqueNameConflict` (violación de `catalog_techniques_name_unique`) y lo convierte a `Result` — antes llegaba como `Error` genérico sin tipar hasta el server action (DOM-006). Pruebas con repositorio en memoria (`__tests__/queries.test.ts`, `commands.test.ts`, incluye el caso de nombre duplicado).
- Capa `db/`: `SupabaseTechniqueRepository` (mapea fila ↔ dominio, `Money` en los bordes). `save()` distingue `23505` (unique_violation) y lanza `TechniqueNameConflict`; cualquier otro error de Supabase sigue siendo una falla de infra genuina. Prueba de integración `db/__tests__/technique-repository.integration.test.ts` verifica lectura + paginación contra el seed y que `save()` con token anónimo es rechazado por RLS.
- `index.ts` (ARCH-003): `listTechniques(query?)` y `getTechnique(id)` — cablean el repositorio de servidor y devuelven `TechniqueView` / `Result<…, TechniqueNotFound>`. Exporta `ServiceFamily`, `TechniqueView`, `TechniqueSnapshot`, `SERVICE_FAMILIES`, `TechniqueNotFound`, `AdminCatalogPage`, `catalogMessages`. `create` / `update` / `deactivate` **no** se exportan. Prueba `__tests__/public-api.integration.test.ts` (read path completo contra Supabase local).
- `client.ts` (ARCH-003): segundo entry point, solo `catalogMessages`, `packageMessages` (para `loading.tsx`/`error.tsx` de paquetes) y `catalogRoutes` (para las pestañas de `src/app/admin/catalog/catalog-tabs.tsx`), sin nada que dependa de `next/headers`. Lo usan los boundaries de ruta que corren en el cliente (`loading.tsx`, `error.tsx`) para no arrastrar código de servidor al bundle.
- Capa `ui/` + ruta `src/app/admin/catalog/`: `AdminCatalogPage` (server) lista las técnicas (`TechniqueTable`, DaisyUI, UI-001/002) con estado vacío + `loading.tsx` + `error.tsx` (UI-003, a11y UI-004), ambos importando texto de `client.ts`, no de `ui/messages` directo; `TechniqueForm` (client, `useActionState`) crea/edita/desactiva. El `layout.tsx` de la ruta exige staff con `requireAdminSession()` (redirige a `/admin`); los server actions chequean `isStaff()` (`require-staff.ts` → `getAuthSession`) para el mensaje amable — RLS conserva la autorización real (SEC-001). Validación **Zod** en el borde (`schema.ts`, DOM-007), texto externalizado en `messages.ts` (DOM-009). Pruebas `ui/__tests__/schema.test.ts`, `ui/__tests__/actions.test.ts`, `src/app/admin/catalog/layout.test.tsx`.
- Test de aislamiento RLS `__tests__/rls-isolation.test.ts` (SEC-002): con token anónimo y con el token de una clienta autenticada real (sign-up, sin service-role key) verifica que `SELECT` funciona (lectura pública intencional) y que cada `INSERT` / `UPDATE` / `DELETE` falla y no altera los datos ni el conteo. El `beforeAll` falla ruidosamente si el seed no está cargado (sin falsos verdes). CI (`job-tests-reales`) levanta Supabase local + `db reset` antes de `npm test`; `supabase` CLI pinneada en `devDependencies`.

Dónde se detiene: los criterios 7b y 8 (la cita no se altera / precio congelado) se trasladaron a US-AGE-05 (ver `docs/process/DEPENDENCIES.md`, «Criterios trasladados»). El camino admin usa RLS + `requireAdminSession`; su control positivo contra la base real lo cubre la prueba pgTAP.

**US-PROD-01 (terminada):** El código de paquetes vive en una subcarpeta `packages/` dentro de cada capa (`domain/packages/`, `application/packages/`, `db/packages/`, `ui/packages/`) para distinguirlo del de técnicas; los archivos de paquetes no llevan comentarios — el porqué está en este SPEC y en el contrato. La UI de `ui/packages/` sigue la estructura de clients: `components/<Componente>/` con `<Componente>.tsx`, `.styles.ts` (importado como `STYLES`), `.types.ts` (props) e `index.ts` para `AdminPackagesPage`, `PackageTable`, `PackageForm`, `PackageFormFeedback` y `PackagePagination`; textos en `constants/`, tipos en `types/`, server actions en `actions/` y el esquema Zod en `validation/`. Las funciones de dominio se llaman `buildPackage`/`markPackageInactive` para no chocar con los casos de uso `createPackage`/`deactivatePackage`. migración `supabase/migrations/20260922000000_catalog_packages.sql` (tablas `catalog_packages` y `catalog_package_techniques`, RLS de solo lectura pública por ahora — la escritura llega en una migración aparte) y entidad `domain/packages/package.ts` (`buildPackage` valida mínimo dos técnicas sin duplicados y precio > 0, DOM-007; `markPackageInactive` no borra, criterio 3 — `Package` es `interface`, sin `class`, ver D-SIN-CLASE). Puerto `PackageRepository` (`application/packages/ports.ts`) y casos de uso `listPackages`/`getPackage` (`application/packages/queries.ts`, paginado PERF-002, reusa `clampPage`/`clampPageSize` de `application/queries.ts`) que exponen `durationTotalMin` — la duración no vive en el dominio, la calcula el repositorio uniendo las técnicas miembro en una sola query (PERF-005, criterio 2). `createPackage`/`updatePackage`/`deactivatePackage` (`application/packages/commands.ts`, con su mensaje en `application/packages/messages.ts`) validan que las técnicas del paquete existan y estén activas con una sola consulta por lote (`TechniqueRepository.findByIds`, agregado también a `db/technique-repository.ts`; PERF-005, sin queries en loop). `db/packages/package-repository.ts` (`createSupabasePackageRepository`, función fábrica sin `class`) reconstruye el dominio con un solo join a `catalog_package_techniques`/`catalog_techniques` (PERF-005) y calcula `durationTotalMin` ahí; `save()` llama a la función `public.catalog_save_package` (migración `20260930000000_catalog_save_package_fn.sql`, `SECURITY INVOKER`: RLS y las políticas `*_staff` siguen aplicando), que hace upsert del paquete y reemplaza sus filas puente en una sola transacción (desde `20261004000000_catalog_save_package_invariants.sql` también valida los invariantes de `buildPackage` —nombre no vacío y al menos dos técnicas sin repetir, `23514`— para que una llamada directa por PostgREST no pueda guardar un paquete que tumbe el listado) — antes eran tres llamadas separadas y un fallo a mitad dejaba un paquete con menos de dos técnicas que tumbaba el listado completo al reconstituirlo. Seed de ejemplo en `supabase/seed.sql` (un paquete con dos técnicas). Migración `20260922000001_catalog_package_write_policies.sql` agrega políticas `catalog_packages_*_staff` y `catalog_package_techniques_*_staff` (reusa `public.auth_is_staff()`). Test de aislamiento `__tests__/package-rls-isolation.test.ts` (SEC-002) cubre lectura pública y escritura denegada a anónimo y a clienta sin rol de staff en ambas tablas y vía `catalog_save_package`. El control positivo vive en `supabase/tests/database/catalog_package_staff_write.test.sql` (pgTAP, mismo arnés que técnicas): un admin crea, edita y desactiva paquetes, la función revierte todo si una técnica no existe, el nombre repetido da `23505` y una clienta no puede escribir. `ui/packages/actions/package-actions.ts` (`createPackageAction`/`updatePackageAction`/`deactivatePackageAction`, mismo patrón `isStaff → Zod → comando → revalidatePath` que técnicas) y `ui/packages/validation/package-schema.ts` (Zod; el checklist de técnicas llega por `formData.getAll('techniqueIds')`, no `Object.fromEntries`, porque un mismo nombre trae varios valores). `AdminPackagesPage` + `PackageTable` (`ui/packages/`, con sus textos en `ui/packages/constants/package-strings.ts` como `packageMessages`, también expuesto por `client.ts` para `loading.tsx`/`error.tsx`, y `PackageActionState` en `ui/packages/types/package-action-state.ts`) listan los paquetes con sus técnicas (por nombre, resueltas con `listTechniques`), duración total y precio; ruta `src/app/admin/catalog/packages/` (`page.tsx`/`loading.tsx`/`error.tsx`, reusa el layout y `catalog.styles.ts` de la ruta padre) con acceso por las pestañas Técnicas/Paquetes de `src/app/admin/catalog/catalog-tabs.tsx`. `ui/packages/components/PackageForm/` (Client, `useActionState`) crea/edita/desactiva: checklist de técnicas activas con duración por técnica visible y suma total recalculada en vivo (criterio 2, mismo cómputo que `db/packages/package-repository.ts`), precio como campo independiente ajustable a mano. Cableado en `AdminPackagesPage` vía `?new`/`?edit`, igual patrón que técnicas. Al editar, el formulario también muestra las técnicas del paquete que hoy están desactivadas, marcadas y con aviso de que hay que quitarlas (antes desaparecían del checklist y se perdían al guardar); la tabla las marca "(desactivada)". `findById` devuelve `null` ante un id que no es UUID, así `?edit=<texto>` o un id vacío en las actions dan "no encontrado" en vez de la pantalla de error. La página pagina los paquetes con `?page=` (`PackagePagination`, 50 por página) y resuelve los nombres de las técnicas de la página con una sola consulta por lote (`listPackageTechniques` → `TechniqueRepository.findByIds`, PERF-005), sin depender de un listado con tope de 100. El checklist del formulario sigue cargando hasta 100 técnicas activas (`MAX_PAGE_SIZE`). `index.ts` (ARCH-003) expone `listPackages(query?)` y `getPackage(id)` — la superficie de solo lectura, cableada con el repositorio de servidor — más `PackageListItem`, `PackageNotFound` (tipo, sin valor en runtime), `ListPackagesQuery` y `AdminPackagesPage`. `createPackage`/`updatePackage`/`deactivatePackage` **no** se exportan, igual que con técnicas. Contrato y garantías en [docs/contracts/catalog-api.md](../../../docs/contracts/catalog-api.md), sección "Paquetes".

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
- **D-SIN-CLASE — el código nuevo de paquetes evita `class`.** `Package` (`domain/packages/package.ts`) es una `interface`, construida solo por `buildPackage()` (DOM-007); `markPackageInactive()`/`packageToView()` son funciones puras en vez de métodos. Los errores de paquete (`domain/packages/errors.ts`) son interfaces con función fábrica y guardas de tipo (`isPackageValidationError`, etc., sobre las constantes `PACKAGE_ERROR_CODES` y una guarda genérica `hasCode`), no extienden `CatalogError`/`DomainError` — ya no comparten esa jerarquía con los errores de `Technique`. `db/packages/package-repository.ts` y el fake de tests son funciones fábrica (`createSupabasePackageRepository`, `createFakePackageRepository`) que devuelven un objeto que implementa `PackageRepository`, no clases con `implements`. `save()` devuelve `Result<void, PackageNameConflict>` (el 23505 de Postgres se mapea a `err`, sin `throw` de objetos planos; solo las fallas de infra lanzan `Error`). `Package` lleva una marca (`unique symbol` no exportado) que solo `buildPackage()` pone, así que un literal con la misma forma no pasa como `Package` (revisión de BayronAQ99 en #134). Alcance: solo el código de esta historia; `Technique`, `Money`, `DomainError` y los repositorios de `content`/`store` siguen siendo clases, pendientes de una regla de equipo aún no escrita en `rules.yaml`.
- Sin ADR: el congelamiento de precio ya lo fija DOM-002; el resto son decisiones locales de la feature.

## Flags

Ninguno. `catalog_admin_write` se retiró al integrar `public.auth_is_staff()` y las políticas RLS de escritura.

## Incremento de US-AGE-13: anticipo por paquete

Contrato ampliado en `docs/contracts/catalog-api.md`: `PackageListItem.deposit`, monto propio por paquete en colones enteros no negativos. Falta columna/RPC, dominio/repositorio y formulario con pruebas reales. La ampliación no implementa reservas ni cierre; esos criterios se trasladaron a US-AGE-05/12 con aprobación del PO. Base de este incremento: #175, dependiente de #173 y #174.

La dueña de US-AGE-13 sigue siendo `payments`; este incremento de `catalog` aporta el anticipo por paquete. El estado en progreso y el registro del PO están en la pila original, PR #176. Esta base de paquetes todavía no contiene esa pila y no se usa su estado heredado de payments para declarar el cierre.
