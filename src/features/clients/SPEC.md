---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: 2026-10-18
historias:
  - id: US-CLI-01
    estado: en_progreso
    falta: "las columnas de morosidad y ultima cita existen sin dato y no tienen filtro: el dato espera a US-MOR-01 y el de ultima cita a US-AGE-05 (criterios diferidos)"
  - id: US-CLI-02
    estado: no_iniciada
  - id: US-CLI-03
    estado: no_iniciada
  - id: US-CLI-04
    estado: terminada
    evidencia: "Pila de 14 piezas: PRs #369 (1/14, esquema), #370 (2/14, bucket), #372, #374, #384, #385, #394, #395, #396, #404, #405, #406 y los PRs de las piezas 13/14 (subir imagenes) y 14/14 (ver imagenes, cierre). Criterio 1 (estudio con texto e imagenes): record-content.test.ts, record-changes.test.ts, record-commands.test.ts, study-editor.test.tsx, add-record-image.test.ts, record-image-action.test.ts, images-editor.test.tsx. Criterio 2 (alergias, sensibilidades, condiciones): clients_record_versions.test.sql (categorias), record-content.test.ts, precautions-editor.test.tsx. Criterio 3 (solo la administradora y cada acceso en la bitacora): clients_record_versions.test.sql y clients_record_images_bucket.test.sql (aislamiento SEC-002 frente a clienta y anon), view-record.test.ts (bitacora fail-closed), record-gateways.test.ts, record-actions.test.ts. Criterio 4 (historial de cambios): clients_record_versions.test.sql (sin UPDATE ni DELETE, una sucesora por version), record-changes.test.ts, record-commands.test.ts (dos cambios simultaneos), record-history.test.ts, record-view.test.tsx. Criterio 5 (imagenes sin URL publica): clients_record_images_bucket.test.sql (bucket privado), record-image-storage.test.ts (URLs firmadas de 5 minutos), images-editor.test.tsx"
  - id: US-CLI-05
    estado: terminada
    evidencia: "PR #16, PR #28, PR #31, PR #32, tests: clients-actions.test.ts, save-client.test.tsx, list-clients.test.ts, clients-list.test.tsx, update-client.test.ts, edit-client.test.tsx"
flags: []
deuda:
  - que: "Prueba de aislamiento RLS (SEC-002) de las politicas de administradora de clients_profiles (supabase/migrations/20260911000000_clients_profiles_admin_access.sql): las pruebas simulan Supabase y no demuestran que una clienta con token valido no pueda leer, crear ni editar a otras"
    aceptada_en: "PR #32, etiqueta excepcion-proceso"
    costo: "3h: arnes de Supabase local en CI y el test con token de clienta contra SELECT, INSERT y UPDATE; 1h si ya existe el arnes de la deuda de auth (PR #3)"
defectos: []
---

# clients

Gestion de clientas: ficha, historial, anotaciones, expediente sensible (SEC-006).

## Qué hace hoy

Existe la ruta `/admin/clients`, dentro del panel de administración. Renderiza el encabezado de la
sección y el botón **Agregar**, que abre el modal de alta. El modal solo cierra con Cancelar o Escape,
y con datos escritos pide confirmar con el `ConfirmDialog` del proyecto. El foco queda confinado al
diálogo y vuelve a *Agregar* al cerrar (UI-004).

*Guardar* llama a `createClientAction()`, que vuelve a validar con `validateClientForm` (DOM-007),
incluidos los largos máximos de nombre, teléfono y correo, que en el navegador solo impone el `maxLength` del HTML;
normaliza el teléfono con `normalizePhone`, guarda `phone_verified = true` y deja `user_id` en `NULL`
(clienta sin cuenta). Antes de insertar revisa en la base que el teléfono no esté registrado
(criterio 3); si lo está, no guarda y el modal muestra `phoneTaken`. Mientras guarda, el botón dice *Guardando…*, se deshabilita y el modal no se
cierra; si el servidor rechaza, el mensaje aparece dentro del modal y lo escrito se conserva. El error
de la base nunca llega a la pantalla: la action devuelve `{ ok: false, error }` con un texto de
`CLIENTS_ERROR_MESSAGES`. La action también llama a `requireAdminSession()`.

Debajo, `ClientsList` muestra las clientas en una tabla de seis columnas: nombre (celda `th scope="row"`),
teléfono, correo, morosidad, última cita y acciones. Morosidad y última cita muestran
`CLIENTS_TABLE_TEXTS.pendingColumnValue` ("Sin dato") en todas las filas: la columna existe, el dato no
(criterios diferidos). `clients-list.test.tsx` exige los seis encabezados en orden, tantas celdas por fila
como encabezados, y el texto de dato pendiente en las dos columnas diferidas. Las clientas las lee la
página en el servidor con `listClientsAction()`:
la primera página de 25, las más recientes primero y solo las columnas que muestra (PERF-002, PERF-005).
La action ya recibe `{ page, pageSize, name }` y devuelve `{ clients, total, page, pageSize }`
(US-CLI-01, sin pantalla todavía): el tamaño solo puede ser uno de `CLIENTS_LIST_LIMITS.pageSizes`
(10, 25 o 50) y cualquier otro valor usa 25; una página inválida es la 0; `name` filtra `full_name` con
`ilike`, recortado a 120 caracteres, con `%`, `_` y `\` escapados y `*` quitado (PostgREST lo lee como
`%`), así que lo escrito se busca como texto. `total` sale de `count: 'exact'` y cuenta todo lo que
cumple el filtro. La página lee `?page`, `?pageSize` y `?name` de la URL y se los pasa.
Sobre la tabla, `ClientsNameFilter` es un `<form role="search">` con un campo de nombre limitado a
`CLIENTS_LIST_LIMITS.nameFilterMaxLength`: al enviarlo escribe `?name` y borra `?page`, un texto en blanco
quita el filtro, y con filtro activo aparece *Quitar filtro*. Sin coincidencias, la lista nombra el filtro
en vez de decir que no hay clientas registradas (UI-003). Lo demuestran `clients-name-filter.test.tsx` y
`clients-list.test.tsx`. Debajo de la tabla, `ClientsPagination` muestra "Página X de Y" con el total de clientas,
*Anterior* y *Siguiente* como enlaces que solo cambian `page` y conservan el resto de la consulta, y un
selector de 10, 25 o 50 que al cambiar vuelve a la primera página. En la primera y en la última página
el enlace que no aplica se dibuja como texto, no como enlace muerto. Cuando la lectura falla o no hay
ninguna clienta, la paginación no se dibuja. Lo demuestra `clients-pagination.test.tsx`. Tiene sus tres estados (UI-003): carga en
`src/app/admin/clients/loading.tsx` (`role="status"`), error con *Reintentar* (`router.refresh()`) y
vacío que sugiere *Agregar*. Tras un alta, `revalidatePath` vuelve a leer y la clienta nueva aparece.

Cada clienta tiene un lápiz de solo icono cuyo `aria-label` la nombra (UI-004). El lápiz abre
`EditClientDialog`, el mismo modal y formulario con los datos cargados: salir con cambios pide
confirmar y el foco vuelve a ese lápiz. *Guardar* llama a `updateClientAction(id)`, que valida igual
que el alta, repite la revisión de teléfono único excluyendo a la propia clienta y no toca
`phone_verified`; si RLS no deja ver la fila, responde `clientNotFound` en vez de fingir éxito
(SEC-005). Alta y edición comparten `useClientDialog`: *Guardando…*, bloqueo de cierre y error
dentro del modal.

Control de acceso de la capa de aplicación: la página y cada action llaman a
`requireAdminSession()` de `auth`, de modo que una visitante anónima o una clienta con sesión de
Google son redirigidas a `/admin`. El middleware de Edge ya cubría `/admin/*` (salvo `/admin`
exacto), pero solo comprueba que haya sesión, no el rol — el rol lo comprueba esta página.

La estructura de carpetas sigue las capas de `docs/spec/ARCHITECTURE.md`, como `_template` y
`catalog`: `domain/` (la clienta, sus límites, `normalizePhone` y `validateClientForm`),
`application/` (los casos de uso `addClient`, `editClient` y `listClients`, el puerto
`ClientRepository` y `CLIENTS_LIST_LIMITS`), `db/` (`clientRepository()`, lo único que conoce
Supabase y `clients_profiles`) y `ui/` (todo en el área `ui/admin-clients/`: las server actions en `ui/admin-clients/actions/client-actions.ts`, los textos en
`ui/admin-clients/constants/client-strings.ts`, los hooks en `ui/admin-clients/hooks/` y un subdirectorio por componente en `ui/admin-clients/components/`). No hay `http/`: la feature no tiene route handlers. `ui/admin-clients/clients-list-url.ts` guarda la
construcción pura de URLs del listado, separada de `ui/admin-clients/hooks/` porque no usa React: así se prueba sin
renderizar. Las pruebas de la interfaz están en `ui/admin-clients/__tests__/` y las de los casos de uso en `application/__tests__/`.

### Expediente de la clienta (US-CLI-04)

Cada fila del listado enlaza a la ficha `/admin/clients/<id>`: volver, nombre, teléfono y la pestaña
**Expediente**. La pestaña muestra el estudio con su técnica recomendada, "Antecedentes y
precauciones" con su categoría, las imágenes y el historial de cambios, y permite registrar y editar
el estudio, agregar (**+**) y quitar antecedentes y subir imágenes. Cada cambio guarda una versión
completa nueva en `clients_record_versions`; la vigente es la última y las anteriores no se tocan.
Cada lectura y cada cambio quedan en la bitácora de `audit`; si la bitácora falla al leer, el
expediente no se muestra. Capas: `domain/record/` (el contenido y sus cambios),
`application/record/` (puertos, lectura y escritura, adaptadores a `audit` y `catalog`),
`db/record/` (versiones, categorías e imágenes) y `ui/admin-record/` (actions, textos y
componentes); la ruta vive en `src/app/admin/clients/[id]/`. Crear categorías nuevas desde el menú
quedó fuera del plan por decisión de José Loría.

## Qué no hace todavía

No existe un flujo de archivado o borrado de clientas en esta rama. `docs/adr/ADR-0009-client-archival-and-exemptions.md` recoge el acuerdo de archivar sin eliminar el perfil ni sus referencias, comunicado por Bayron el 2026-10-05. Antes de implementarlo deben acordarse permisos, búsquedas y reservas, citas existentes y restauración. La pieza 21 de US-AGE-13 implementa y prueba la migración de `payments` a `ON DELETE RESTRICT`; bloquea el borrado de perfiles con exoneraciones activas o históricas, incluso desde `auth.users`. Su integración sigue pendiente. Reactivar un perfil deberá revisar la vigencia de su exoneración antes de aplicarla. Este cambio de documentación no implementa archivado ni completa una historia de `clients`.

**No hay prueba de aislamiento RLS (SEC-002)**; está registrada como deuda. Las pruebas de las
actions simulan Supabase: demuestran qué se envía y se lee, no qué permite RLS.

La tabla `public.clients_profiles` existe desde la migración
`20260901000000_auth_roles_and_clients.sql`, pero hoy solo la escribe `auth` cuando una clienta se
registra con Google, además del alta de esta feature. Le falta lo que US-CLI-05 necesita:

- la prueba de aislamiento (SEC-002) de la política RLS de administradora de
  `20260911000000_clients_profiles_admin_access.sql`.

El listado con filtros y paginación **no pertenece a esta historia**: es US-CLI-01, que depende de
esta. US-CLI-05 solo necesita buscar por teléfono para detectar el duplicado.

## Contrato público (`src/features/clients/index.ts`)

Único punto de entrada (ARCH-003). Exporta `AddClientDialog` —lo que monta la ruta—, el modal, el
`ConfirmDialog`, el formulario, `AddClientButton`, `ClientsList`, `ClientRecord`, los hooks
`useClientForm`, `useClientDialog` y `useFocusTrap`, `createClientAction`, `listClientsAction` y `updateClientAction` con sus tipos
`SaveClientResult`, `ListClientsQuery` y `ListClientsResult`, `validateClientForm`, `normalizePhone` y las constantes de
textos y límites, entre ellas `CLIENTS_LIST_LIMITS`, `CLIENTS_TABLE_HEADERS`, `CLIENTS_TABLE_TEXTS` , `CLIENTS_PAGINATION_TEXTS` y `CLIENTS_FILTER_TEXTS` (DOM-009).
También exporta `ClientsPagination` y `ClientsNameFilter`. Para la ficha y el expediente (US-CLI-04):
`getClientAction`, `CLIENTS_PATH`, `clientRecordPath`, `CLIENT_PROFILE_LABELS`, `RecordView`,
`RecordLoadError`, `viewRecordAction`, `listTechniqueOptionsAction`, `listCategoryOptionsAction`,
`RECORD_LABELS` y `STUDY_FORM_LABELS`.

## Invariantes

- **La sección es exclusiva de la administradora.** `/admin/clients` exige rol `admin` o
  `superadmin` vía `requireAdminSession()`. Esa comprobación es el mensaje de error amable; la
  defensa real es la política RLS de la tabla (SEC-001), que aún no tiene prueba de aislamiento.
- **Toda tabla de esta feature lleva el prefijo `clients_`** (ARCH-006) y RLS activo con su prueba
  de aislamiento cross-cliente en CI (SEC-002).
- **El teléfono identifica a una clienta.** No pueden coexistir dos con el mismo número (criterio 3).
- **Una clienta creada a mano por la administradora nace con el teléfono verificado** (criterio 4).
- **El expediente es dato sensible** (SEC-006): solo lo lee y escribe la administradora (RLS con
  `auth_is_admin()`), cada lectura y cada cambio quedan en la bitácora, y sus imágenes viven en un
  bucket privado y se ven solo con URLs firmadas de 5 minutos.
- **El historial del expediente no se reescribe ni se borra:** la base no tiene políticas de UPDATE
  ni DELETE en `clients_record_versions` ni en el bucket de imágenes.

## Decisiones

- **2026-09-07 — La feature sigue la distribución de carpetas de `auth`** y no las capas
  `domain/ application/ http/ db/` de `docs/spec/ARCHITECTURE.md`. Motivo: consistencia con el único
  código que existe hoy. **Consecuencia asumida:** `check-domain-purity.sh` solo vigila `domain/` y
  `application/`, así que DOM-004 (`new Date()` prohibido) queda sin check automático aquí y depende
  de revisión humana.
- **2026-09-07 — US-CLI-05 se entrega en varios PRs**, uno por criterio de aceptación, porque la
  historia completa excede el límite de 400 líneas de INT-002.
- **2026-09-14 — "Unificar" queda fuera de US-CLI-05 por decisión de José Loría**: el criterio 3 se
  reduce a impedir el duplicado por teléfono. El backlog no se editó y sigue pidiendo unificar.
- **2026-09-07 — Pendiente de acuerdo contrato-primero (INT-003): cómo comprueba esta feature que la
  sesión es de una administradora.** El dato vive en `auth_user_roles`, tabla de `auth`, y ARCH-005
  prohíbe consultarla directamente. Propuesta: función `SECURITY DEFINER` publicada por `auth`.
- **2026-09-07 — El criterio 1 se entrega primero solo como interfaz** y **no está cumplido** hasta
  que escriba en la base con su prueba. `email` es obligatorio: `clients_profiles.email` es `NOT NULL`.
- **2026-09-08 — El estado de errores borra la clave, no la vacía**; si sobrevive, el resumen rojo no
  se retira. Cubierto por `form-error-summary.test.tsx`.
- **2026-09-12 — El alta se parte en dos PRs apilados (INT-002):** este, sin montar, y el modal con
  su confirmación de descarte. `useFocusTrap` entra aquí; su prueba llega con el modal que lo usa.
- **2026-09-12 — `ConfirmDialog` vive en `clients`, no en `shared/`**: un solo consumidor no justifica
  una API compartida. Trampa de foco cubierta por `modal-focus-trap.test.tsx`.
- **2026-09-14 — Alta y edición comparten `ClientModal` y `ClientForm`** (antes `AddClient*`). `isDirty`
  compara contra los valores iniciales: cancelar la edición sin tocar nada no pregunta (`edit-client.test.tsx`).
- **2026-09-14 — El descarte confirmado está duplicado** en `AddClientDialog` y `EditClientDialog`
  (~12 líneas) para caber en INT-002; se extrae a un hook cuando llegue la persistencia.
- **2026-09-15 — La persistencia entra por tareas (INT-002): primero solo el alta**, en
  `feat/US-CLI-05-persist-clients` apilada sobre `feat/US-CLI-05-edit-client`. La lectura de la lista y
  la edición guardada van en PRs siguientes. El guardado del alta vive en `AddClientDialog`; se extrae
  a un hook compartido cuando la edición también guarde.
- **2026-09-15 — Una sola forma guardada por teléfono, por decisión de José Loría:** sin `+`, ocho
  dígitos son de Costa Rica y se guarda `+506` + dígitos; con `+`, se respetan los dígitos que trae
  (`validation/normalize-phone.ts`, `CLIENT_PHONE_FORMAT`). Es la base del criterio 3.
- **2026-09-15 — El teléfono único se revisa en código, no con restricción de base, por decisión de
  José Loría:** `isPhoneTaken` en `actions/clients-actions.ts` busca los últimos 8 dígitos en orden
  (`like '%8%8%8%8%7%7%7%7%'`) y confirma con `normalizePhone`, así atrapa también los teléfonos que
  `updateClientPhoneAction` de `auth` guarda sin normalizar. Sin migración. **Consecuencia asumida:**
  dos altas simultáneas con el mismo número pueden pasar ambas, porque la base no lo impide; y
  `idx_clients_profiles_phone` no sirve a un `like` con comodín inicial (lectura completa de la tabla).
- **2026-09-15 — La lectura de la lista entra en `feat/US-CLI-05-read-edit-clients`**, apilada sobre
  `feat/US-CLI-05-persist-clients`, y borra `constants/sample-clients.ts` (paga las dos deudas de
  `feat/US-CLI-05-edit-client`). Solo se lee la página 0: navegar páginas y filtrar es US-CLI-01. Las
  pruebas de componentes usan `__tests__/client-fixtures.ts`.
- **2026-09-15 — Datos de desarrollo en `supabase/seed.sql`, no en una migración:** 5 clientas sin
  cuenta, teléfono normalizado y verificado, idempotente por teléfono. Solo lo aplica
  `supabase db reset` en local; una migración llegaría a producción y contaría para INT-008.
- **2026-09-15 — La edición guardada entra en `feat/US-CLI-05-save-edit-client`.** El guardado de alta
  y edición se extrae a `hooks/useClientDialog.ts` (resuelve la duplicación del 2026-09-14). Editar no
  toca `phone_verified`. `updated_at` lo pone `updateClientAction` con `new Date()`: la tabla no tiene
  trigger y DOM-004 rige `domain/`, que esta feature no tiene (decisión del 2026-09-07).
- **2026-09-15 — SEC-002 queda como deuda aceptada por decisión de José Loría**, por el escape de
  proceso (`docs/spec/INTEGRATION.md#el-escape-legítimo`): el PR lleva la etiqueta `excepcion-proceso`
  y su justificación. Mismo camino que la deuda de `auth` del PR #3.
- **2026-09-15 — US-CLI-05 se marca `terminada` dentro del PR #32**, el último de la pila
  (#16 → #28 → #31 → #32), con esos PRs como evidencia (EST-005). La pila se mergea en orden: #32 no
  entra a `main` antes que los otros tres. La deuda de SEC-002 sigue abierta.
- **2026-09-15 — Los estilos se importan como `STYLES`, no como `s`** (decisión de revisión de código):
  `import { clientsListStyles as STYLES } from './ClientsList.styles'`. Aplicado a los 8 archivos de
  `clients` y de su ruta; `auth` y el resto de rutas se alinean cuando se toquen. Solo cambia el alias:
  ni los nombres de los objetos de estilos ni sus claves.
- **2026-09-15 — Las rutas de iconos SVG viven en `constants/clients-icons.ts`**, no dentro del JSX
  (mismo comentario de revisión). Hoy solo está el lápiz de `ClientsList`; no hay imágenes ni otros
  assets en la feature.
- **2026-09-16 — US-CLI-01 empieza en `us/US-CLI-01`, con piezas apiladas (INT-001, INT-002):**
  `feat/US-CLI-01-read-client-list` (lectura con parámetros y encabezado de la página), luego la tabla, la paginación y el filtro por nombre.
  El encabezado de `/admin/clients` se alinea con el de `/admin/dashboard`: dentro del `<main>` del layout de `admin`, sin un
  `<main>` propio anidado.
- **2026-09-16 — Morosidad y última cita son criterios diferidos:**
  el dato lo producen `delinquency` (US-MOR-01) y `scheduling` (US-AGE-05), sin tablas ni contrato hoy, y ARCH-005 prohíbe leer
  sus tablas. No se simulan con datos falsos (EST-005). Cuando existan, entran con su contrato (INT-003) y US-CLI-01 sigue
  `en_progreso` hasta entonces.
- **2026-09-16 — El filtro por nombre no lleva índice todavía (PERF-001 sobre PERF-003):** `ilike '%texto%'`
  no lo sirve un índice B-tree; el que sirve es GIN con `pg_trgm`, que es una migración. Con las clientas
  de hoy la lectura completa no se nota; se crea cuando una medición lo pida. Tampoco ignora tildes
  ("Maria" no encuentra "María"): eso pide `unaccent`, otra migración.
- **2026-09-20 — Las columnas de morosidad y última cita se dibujan desde ya, sin dato, por decisión de
  José Loría.** Matiza la decisión del 2026-09-16: la estructura de la tabla no espera a US-MOR-01 ni a
  US-AGE-05, pero el dato sigue sin inventarse (EST-005). Cada celda muestra el texto
  `CLIENTS_TABLE_TEXTS.pendingColumnValue` en cursiva y atenuado, no una celda en blanco, que se leería
  como "no debe nada" y como "nunca ha venido". Sus filtros no existen todavía. **Consecuencia asumida:**
  al llegar el dato hay que cambiar esas dos celdas y la prueba que hoy cuenta los textos pendientes.
- **2026-09-20 — El estado del listado vive en la URL (`?page`, `?pageSize`), no en el cliente.** La
  página lo lee y `listClientsAction` lo sanea, así que basta un enlace para cambiar de página: la
  lectura sigue ocurriendo en el servidor (PERF-002) y la pantalla se puede compartir o recargar sin
  perder dónde estaba. **Consecuencia asumida:** cambiar el tamaño de página necesita `router.push`,
  y eso obliga a que `ClientsPagination` sea un componente cliente.
- **2026-09-20 — El filtro por nombre se envía, no se busca al teclear.** Un `<form>` con su botón
  *Buscar*: cada pulsación sería una lectura a la base y una entrada en el historial del navegador.
  El campo lleva `key={name}`, para que al quitar el filtro React lo remonte y no conserve lo escrito.
- **2026-09-20 — La construcción de URLs del listado queda duplicada en `ClientsPagination` y
  `ClientsNameFilter`** (~5 líneas cada uno). Se extrae a un hook con una función pura por debajo
  ahora que existe el segundo consumidor; se pospone para no mezclar refactor y funcionalidad en la
  misma pieza (INT-002). **Costo:** 1h, incluye mover las pruebas de construcción de URL a la función pura.
- **2026-09-21 — Pagada la deuda anterior: `urls/clients-list-url.ts` (puro) y
  `hooks/useClientsListQuery.ts` (el que sabe de router).** El corte está donde está porque
  `usePathname`, `useSearchParams` y `useRouter` son hooks: compartir código que los llama obliga a
  que ese código sea un hook, pero las reglas de la consulta —que un nombre en blanco no filtra, que
  filtrar o cambiar el tamaño vuelve a la primera página— no necesitan React y se prueban mejor sin él.
  El hook expone `urlWith` (devuelve la URL, para un `<Link>` que navega solo) y `navigateWith` (la
  empuja, para el `<select>` y el formulario, que no tienen enlace que seguir). **Consecuencia asumida:**
  las pruebas de forma de URL viven en `clients-list-url.test.ts`; en los tests de componente queda
  solo que el control llegue al hook, no cómo se arma la cadena.
- **2026-09-20 — La columna de acciones lleva encabezado visible**, no `sr-only` como nació el
  2026-09-20 en esta misma pieza (decisión de José Loría). UI-004 se cumple igual: la columna tiene
  nombre accesible; ahora además se ve.
- **2026-09-23 — Se eliminaron los comentarios del código de la feature** (`src/features/clients/**` y
  `src/app/admin/clients/**`, pruebas incluidas), por indicación del profesor. Solo se borraron líneas;
  el comportamiento no cambia y las pruebas siguen pasando.
- **2026-10-04 — La feature pasa a las capas `domain/ application/ ui/`, por decisión de José Loría.**
  Revierte la decisión del 2026-09-07: `catalog` ya sigue `docs/spec/ARCHITECTURE.md` y `clients` era
  la feature distinta. Se movió con `git mv`, cambiando solo rutas de import; `index.ts` exporta los
  mismos nombres, así que `src/app/admin/clients/` no cambia (ARCH-003). Los componentes conservan un
  subdirectorio cada uno dentro de `ui/`: son 11 con hasta 4 archivos, y aplanarlos como `catalog`
  dejaría unos 40 archivos en una sola carpeta. Las pruebas no se mueven: la evidencia de US-CLI-05 las
  cita por nombre. Las decisiones anteriores nombran las rutas viejas (`actions/`, `validation/`,
  `hooks/`…) porque son bitácora. **Consecuencia:** `check-domain-purity.sh` vigila ahora `domain/` y
  `application/` de esta feature (DOM-004).
- **2026-10-04 — Las dependencias entre capas apuntan hacia adentro: `ui → application → domain`.**
  Los textos de validación pasan a `domain/client-validation-messages.ts` y `ui/messages.ts` los
  esparce dentro de `CLIENTS_ERROR_MESSAGES`, que conserva las mismas claves y textos; así
  `validateClientForm` no importa de `ui/`. `CLIENTS_LIST_LIMITS` pasa a
  `application/clients-list-limits.ts`: los tamaños de página son política del listado, no un
  límite de la clienta. `EMPTY_CLIENT_FORM_VALUES` y `CLIENT_FORM_LIMITS.notesRows` se quedan en
  `domain/client-form.ts` aunque solo los use el formulario: separarlos cambia la forma de constantes
  públicas sin ganar nada hoy.
- **2026-10-04 — `ui/actions.ts` se parte como en `catalog`: action delgada, caso de uso y repositorio.**
  La action solo exige la sesión, arma el repositorio, llama al caso de uso, traduce su código de
  error a un texto de `CLIENTS_ERROR_MESSAGES` y revalida. Los casos de uso de `application/` validan,
  normalizan, deciden el duplicado y sanean la página; devuelven `Result` con códigos
  (`'phone-taken'`, `'not-found'`…), no textos, para no depender de `ui/`. `db/client-repository.ts`
  es una función fábrica (ADR-0008) y guarda lo propio de Supabase: tabla, columnas, el patrón
  `like` de los dígitos en orden y el escape de comodines del `ilike`. El `new Date()` de `updated_at`
  vive ahí y no en `application/` (DOM-004). `SaveClientResult` y `ListClientsResult` llevan un texto
  para la pantalla, así que pasan a `ui/actions.types.ts`; `ListClientsQuery` es la entrada del caso de
  uso y pasa a `application/ports.ts`. Las pruebas de las actions no cambiaron y siguen pasando: la
  secuencia de llamadas a Supabase es la misma. **Consecuencia asumida:** `updateClientAction` con un id
  vacío crea el cliente de Supabase antes de rechazarlo, aunque no consulta la base.
- **2026-10-17 — US-CLI-04 se entrega en 8 piezas (INT-002, INT-008), por decisión de José Loría.**
  Las dos migraciones van por fuera del stack, cada una en su PR directo a `main`: 1/8 el esquema
  del expediente y 2/8 el bucket privado de imágenes. El código (3/8 a 8/8) es un stack que sale de
  `main`; la 5/8 espera a que 1/8 esté en `main` y la 8/8 a que lo esté 2/8. Cada PR trae una sola
  migración, así que INT-008 se cumple pieza por pieza.
- **2026-10-17 — El expediente es una cadena de versiones completas, append-only.** Cada cambio
  (registro inicial, agregar o quitar un antecedente, editar el estudio, agregar una imagen) inserta
  una fila en `clients_record_versions` con la foto entera del expediente; la vigente es la última.
  Sin políticas de UPDATE ni DELETE, la base no deja reescribir ni borrar el historial (criterio 4),
  igual que `audit_events`. "Quitar" un antecedente es una versión nueva sin él, no un borrado.
  No hay tabla `clients_records`: el expediente de una clienta son sus versiones. Un índice único
  parcial impide dos registros iniciales por clienta, y la FK compuesta
  `(previous_version_id, client_id)` impide que una versión continúe el expediente de otra.
- **2026-10-17 — Concurrencia por `UNIQUE (previous_version_id)`.** Una versión solo puede tener
  una sucesora: si dos sesiones guardan sobre la misma foto, la segunda choca y debe recargar, en
  vez de borrar sin saberlo lo que agregó la primera. Lo garantiza la base, sin bloqueos.
- **2026-10-17 — Antecedentes e imágenes en `jsonb` dentro de la versión, no en tablas aparte.**
  Guardar una versión es un solo `INSERT`, atómico sin función SQL. **Consecuencia asumida:** la
  base no tiene FK desde los antecedentes a su categoría; la forma de cada elemento la valida el
  dominio, y cada antecedente guarda una copia del nombre de la categoría, que es lo que muestra el
  historial. Consultar "todas las clientas con tal alergia" no lo pide ninguna historia.
- **2026-10-17 — Las categorías de antecedentes son una tabla, no un `CHECK`, por decisión de José
  Loría:** la administradora crea las que falten desde el diálogo de agregar, sin migración. La
  migración trae Alergia, Sensibilidad y Condición relevante (criterio 2); van en la migración y no
  en `seed.sql` porque tienen que existir en producción. Únicas sin importar mayúsculas; no se
  renombran ni se borran, porque el historial las cita.
- **2026-10-17 — La técnica recomendada se elige de `catalog` por su API pública**
  (`listTechniques`, `getTechnique`), sin cambiar su contrato (INT-003 no aplica). La versión guarda
  `recommended_technique_id` sin FK (ARCH-005) y una copia del nombre: el historial muestra lo que
  se recomendó ese día aunque la técnica cambie de nombre.
- **2026-10-17 — Opción A para "actualizar con cada cita posterior":** cada versión lleva fecha y
  autora, sin vínculo a una cita. Vincular algo a una cita concreta es US-CLI-03 (anotaciones), que
  depende de US-CLI-02 y US-AGE-05. Si se quiere el vínculo, se agrega después una columna
  `appointment_id` con una migración forward.
- **2026-10-17 — Frontera con US-CLI-03:** el expediente es el estado clínico vigente; las
  anotaciones son lo que pasó en cada cita, y se pueden borrar. Un dato clínico escrito en una
  anotación o en `clients_profiles.notes` queda fuera de SEC-006 (sin bitácora y borrable). Cuando
  llegue US-CLI-03, su formulario debe orientar a usar el expediente para lo clínico.
- **2026-10-17 — Toda lectura del expediente se audita, fail-closed (SEC-006).** Se registra el
  acceso antes de devolver los datos; si la bitácora falla, no se muestran. El evento lleva actor,
  acción y clienta, nunca el contenido del expediente. El expediente vive en su propia pestaña de
  la ficha para que el acceso sea deliberado y la bitácora no se llene de accesos que no ocurrieron.
- **2026-10-17 — Solo la administradora (`auth_is_admin()`), no `auth_is_staff()`**, en las dos
  tablas (SEC-006). La política de INSERT exige además `created_by = auth.uid()`: nadie firma una
  versión ni una categoría a nombre de otra persona. `client_id` es `ON DELETE RESTRICT`
  (ADR-0009): una clienta con expediente no se borra.
- **2026-10-17 — El bucket `clients-record-images` (pieza 2/8, PR #370) es privado, de 1 MB y solo
  JPEG, PNG y WebP.** Solo la administradora lee y sube, y solo dentro de la carpeta de una clienta
  que existe (`<client_id>/archivo`); sin políticas de UPDATE ni DELETE. Se registra aquí y no en
  #370 para que las dos ramas no editaran las mismas líneas del SPEC. Supabase ya impide borrar de
  `storage.objects` por SQL (trigger `storage.protect_delete`); la falta de política de DELETE cierra
  también el camino de la API.
- **2026-10-17 — US-CLI-04 pasa de 8 a 9 piezas (INT-002), por decisión de José Loría.** El dominio
  estimado en ~350 líneas salió en ~525 con sus pruebas, sobre el tope de 400. Se parte por un corte
  natural: 3/9 es qué es un contenido válido (`buildRecordContent`) y 4/9 cómo cambia el contenido. Lo que
  seguía se corre un número: casos de uso 5/9, repositorio y actions 6/9, vista 7/9, formularios
  8/9, imágenes 9/9. #369 y #370 pasan a 1/9 y 2/9.
- **2026-10-17 — El contenido del expediente vive en `domain/record/` (pieza 3/9).** `buildRecordContent`
  es la única forma de crear un contenido válido: recorta espacios, aplica los mismos topes que los
  `CHECK` de la base (`RECORD_LIMITS`) y lleva una marca `unique symbol` no exportada, para que un
  objeto escrito a mano con la misma forma no pase por un contenido válido.
- **2026-10-17 — Los problemas de validación son códigos (`'study-text-empty'`…), no textos.** El
  dominio no sabe de pantallas: la UI traduce cada código con sus constantes (DOM-009). Por lo mismo,
  el texto del historial ("Se agregó alergia: X") se arma en la UI a partir de `change_kind` y de la
  comparación de dos contenidos, no en el dominio.
- **2026-10-17 — Cada antecedente lleva su `id`, generado fuera del dominio.** *Quitar* dice qué
  antecedente quita, no su posición en la lista. Un antecedente repetido (misma categoría y misma
  descripción sin importar mayúsculas, o mismo id) se rechaza.
- **2026-10-17 — Los cambios del contenido viven en `domain/record/record-changes.ts` (pieza 4/9).**
  `createInitialRecord`, `addPrecaution`, `removePrecaution`, `editStudy` y `addImage` reciben el contenido
  vigente y devuelven `{ changeKind, content }` sin modificarlo: cada cambio vuelve a pasar por
  `buildRecordContent`, así que un contenido nuevo cumple las mismas reglas que el inicial. Quitar un
  antecedente que no está devuelve `PrecautionNotFound`.
- **2026-10-17 — Editar el estudio sin cambiar nada devuelve `RecordUnchanged`**, en vez de guardar
  una versión idéntica que ensuciaría el historial. Se compara después de recortar espacios: agregar
  un espacio al final no cuenta como cambio.
- **2026-10-17 — US-CLI-04 pasa de 9 a 10 piezas (INT-002), por decisión de José Loría.** Los casos
  de uso salieron en ~454 líneas con sus dobles de prueba. Se parten en leer (5/10) y escribir
  (6/10); lo que seguía se corre un número: repositorio y actions 7/10, vista 8/10, formularios
  9/10, imágenes 10/10.
- **2026-10-17 — La aplicación del expediente habla con el exterior solo por puertos (pieza 5/10):**
  `RecordRepository`, `RecordAuditLog`, `TechniqueLookup` y `PrecautionCategoryLookup` en
  `application/record/record-ports.ts`. `clients` no importa `audit` ni `catalog` aquí; los
  adaptadores que llaman a sus APIs públicas llegan en la 7/10. Así se prueban con dobles en memoria.
- **2026-10-17 — Leer el expediente audita primero (fail-closed).** `viewRecord` registra
  `clients.record.viewed` antes de leer y, si la bitácora falla, devuelve `audit-failed` sin datos.
- **2026-10-17 — El historial se lee con tope (`RECORD_HISTORY_LIMIT` = 50, PERF-002).** Si un
  expediente pasa de 50 versiones, las más viejas no se muestran todavía; paginar el historial se
  agrega cuando haga falta.
- **2026-10-17 — Escribir guarda y después audita (pieza 6/10).** `record-commands.ts` crea el registro
  inicial, agrega y quita antecedentes y edita el estudio. Cada cambio guarda una versión encadenada
  a la vigente, con autora y fecha del reloj inyectado (DOM-004), y registra
  `clients.record.updated`. Si la bitácora falla después de guardar, se lanza un error en vez de
  callarlo, igual que `payments.exemptClient`.
- **2026-10-17 — Una técnica nueva tiene que estar activa en `catalog`; la vigente se conserva aunque
  se haya desactivado.** Editar solo el texto de un estudio cuya técnica se desactivó después no
  falla: si el id no cambió, se reusa la copia guardada sin consultar `catalog`.
- **2026-10-17 — Un choque de versiones llega como `version-conflict`.** Si dos cambios parten de la
  misma versión, el segundo choca con `UNIQUE (previous_version_id)` y no se guarda; la pantalla
  pedirá recargar. El repositorio traduce el error de la base en la 7/10.
- **2026-10-18 — El contenido del expediente se llama `RecordContent` desde la pieza 3, por decisión
  de José Loría.** Se llamó `RecordSnapshot` hasta este día; "snapshot" había que explicarlo y
  "contenido" se lee solo: el contenido es lo escrito en el expediente, y una versión es ese
  contenido más quién, cuándo y por qué. Se renombró dentro de cada pieza (3/10 a 6/10, con rebase y
  force-push de sus ramas) en vez de sumar una pieza de renombre, porque sus PRs aún no tenían
  revisión humana. Solo cambiaron nombres; las pruebas pasan sin tocar ninguna aserción.
- **2026-10-18 — US-CLI-04 pasa de 10 a 11 piezas (INT-002), por decisión de José Loría.** Repositorio,
  adaptadores y server actions estimados con sus pruebas daban ~480 líneas. Se parten en
  repositorio y adaptadores (7/11) y server actions (8/11); vista 9/11, formularios 10/11, imágenes
  11/11.
- **2026-10-18 — El repositorio del expediente vive en `db/record/` (pieza 7/11).** Es una función
  fábrica (ADR-0008) que recibe el cliente de Supabase, para poder probarla con uno simulado. Al
  leer, cada fila vuelve a pasar por `buildRecordContent`: si el `jsonb` de antecedentes o imágenes
  no tiene la forma esperada, se lanza un error en vez de mostrar un expediente a medias. El código
  `23505` de la base (versión anterior repetida o segundo registro inicial) se traduce a
  `version-conflict`; cualquier otro error se lanza, porque no es esperado (DOM-006).
- **2026-10-18 — Los adaptadores a `audit` y `catalog` viven en `application/record/record-gateways.ts`,**
  como `scheduling/application/catalog-adapter.ts`, y solo usan sus APIs públicas (ARCH-003). El de
  la bitácora convierte en `false` tanto un evento rechazado como un error de red o de RLS: para el
  expediente las dos cosas significan "el acceso no quedó registrado" (fail-closed, SEC-006).
- **2026-10-18 — Las server actions del expediente viven en `ui/admin-record/actions/` (pieza 8/11).**
  Ver, crear, agregar y quitar antecedentes y editar el estudio. Cada una exige primero
  `requireAdminSession()` y firma con el id de esa sesión, nunca con uno que llegue del navegador
  (SEC-005). Los ids de clienta, técnica y categoría se revisan con forma de UUID antes de tocar la
  base: uno mal formado se responde como "no encontrado" sin consultar nada. Devuelven datos planos
  (`RecordVersionView`, fecha en ISO, sin la marca del contenido) porque viajan al navegador, y cada
  código de error o problema de validación se traduce a su texto en `record-strings.ts` (DOM-009).
  Tras guardar se revalida `/admin/clients/<id>/expediente`, la ruta que crea la 9/11.
- **2026-10-18 — 12 piezas (INT-002), por decisión de José Loría:** la pestaña completa estimaba ~580
  líneas; se parte en vista con estados (9/12) y ficha con pestañas (10/12).
- **2026-10-18 — Vista en `/admin/clients/<id>/expediente` (pieza 9/12).** `RecordView` muestra
  estudio y técnica, antecedentes con su categoría, cuántas imágenes hay (verlas es la 12/12) y el
  historial. Estados (UI-003): vacío (crear llega en la 11/12), `loading.tsx`, y error con
  *Reintentar* si falla la bitácora (`RecordLoadError`) o algo inesperado (`error.tsx`).
- **2026-10-18 — `describeVersion` (UI) nombra el antecedente agregado o quitado** comparando con la
  versión anterior. Si esa quedó fuera del tope de 50, "se agregó" usa el último antecedente y "se
  quitó" no inventa cuál. Fechas en la hora del estudio (`STUDIO_TIME_ZONE`).
- **2026-10-18 — Ficha de la clienta en `src/app/admin/clients/[id]/layout.tsx` (pieza 10/12).** Arriba,
  volver al listado, nombre y teléfono; debajo, las pestañas (hoy solo Expediente, con
  `aria-current`). La lee `getClientAction(id)`: sesión exigida, id con forma de UUID y `findById`
  en el repositorio. Una clienta inexistente o que RLS no deja ver va a `notFound()`; si la base
  falla, la ficha lo avisa y la pestaña igual se ve. Cada fila del listado suma un enlace con ícono
  al expediente, con nombre accesible propio (UI-004). La revisión de UUID y las rutas pasan a
  `ui/client-routes.ts`, que comparten las dos áreas de `ui/`.
- **2026-10-18 — 14 piezas (INT-002), por decisión de José Loría:** los formularios estimaban ~830
  líneas; se parten en estudio (11/14), antecedentes (12/14) y categoría nueva (13/14). La 13/14
  queda **en pausa**: se decide después si se hace. Imágenes 14/14.
- **2026-10-18 — Registrar y editar el estudio (pieza 11/14).** `StudyEditor` alterna entre ver el
  estudio y `StudyForm`: en el estado vacío ofrece "Registrar estudio inicial" y con expediente
  "Editar estudio". El formulario va en línea, no en un modal: es un solo bloque de la página y no
  necesita trampa de foco. El menú de técnicas sale de `listTechniqueOptionsAction` (solo activas,
  tope de 100); si la técnica vigente ya no está activa, se agrega al menú para no perderla al
  editar. Si `catalog` falla, el menú queda solo con "Sin técnica recomendada" y el expediente
  igual se muestra. Errores y problemas del servidor se anuncian con `role="alert"` sin cerrar el
  formulario; al guardar, se cierra y `router.refresh()` trae la versión nueva.
- **2026-10-18 — Antecedentes (12/14):** el **+** usa las categorías existentes (tope de 100); *Quitar*
  nombra su antecedente (UI-004) y confirma con el `ConfirmDialog` de `clients`: sigue en el historial.
- **2026-10-18 — Crear categorías nuevas sale del plan por ahora, por decisión de José Loría;** las
  imágenes ocupan 13/14 (subir) y 14/14 (verlas y cerrar). Si la categoría vuelve, se renumera.
- **2026-10-18 — Subir imágenes (pieza 13/14).** `addRecordImageAction` recibe el archivo en un
  `FormData`; `recordImageExtension` (dominio) acepta JPEG, PNG y WebP de hasta 1 MB, igual que el
  bucket, midiendo los bytes reales. Se sube a `<clienta>/<uuid>.<ext>` y después se guarda la
  versión con `addImage`, con su bitácora. **Consecuencia asumida, por decisión de José Loría:** si
  guardar la versión falla (p.ej. un choque), el archivo queda en el bucket sin versión que lo use;
  no se borra porque el bucket no tiene política de DELETE. Es privado, así que nadie lo ve. **Límite
  conocido:** Next corta las server actions a 1 MB de cuerpo, así que una imagen muy cerca de 1 MB
  falla antes de llegar a la validación (la misma deuda abierta en `store`).
- **2026-10-18 — Ver las imágenes y cierre de US-CLI-04 (pieza 14/14).** `viewRecordAction`, después
  de registrar el acceso, firma las rutas de las imágenes vigentes con URLs de 5 minutos
  (`RECORD_IMAGE_URL_SECONDS`, por decisión de José Loría): lo bastante para mirar la página y lo
  bastante corto para que un enlace copiado deje de servir. Si firmar falla, el expediente igual se
  muestra y cada imagen dice "Imagen no disponible"; la pantalla nunca arma una URL a partir de la
  ruta. `ImagesEditor` muestra miniaturas con texto alternativo propio y el campo para subir. Con
  esta pieza US-CLI-04 queda `terminada`; su evidencia está en el front-matter.
- **2026-10-18 — Mejoras visuales del expediente en dos piezas más (15/16 y 16/16), por decisión de
  José Loría tras probarlo a mano.** No cambian ningún criterio: US-CLI-04 sigue `terminada`. Van
  encima de la 14/14 porque la 9/14 y la 12/14 ya estaban cerca de las 400 líneas. **15/16:** íconos
  SVG propios en los títulos (sin librería nueva), la ficha con ancho máximo para que no se estire en
  pantallas grandes, y "Antecedentes y precauciones" con "+ Agregar" arriba
  y una tarjeta por categoría con su conteo (`groupPrecautions`). Una categoría nueva tendría su
  tarjeta con el nombre guardado y un ícono genérico.
- **2026-10-18 — Imágenes en mosaicos con visor (pieza 16/16).** Las imágenes se muestran en mosaicos
  cuadrados; el último, "+ Agregar foto", sube apenas se elige el archivo. Tocar una miniatura abre
  `ImageViewer`: la imagen en grande sobre fondo oscuro, con la misma URL firmada (no pide nada al
  servidor), flechas y teclas ← → entre imágenes, y cierre con ✕, Escape o tocando afuera. Reusa
  `useFocusTrap` y al cerrar devuelve el foco a la miniatura que lo abrió (UI-004). La ficha queda
  alineada a la izquierda, junto al menú, sin centrarse en pantallas anchas (decisión de José Loría).
- **2026-10-19 — Robustez tras la auditoría del 2026-10-19 (pieza 17/19).** A1: el tope de imagen
  queda en 1.000.000 bytes, debajo del límite de 1 MB del cuerpo de las server actions, y la
  pantalla valida tamaño y tipo antes de enviar. M1: las actions de escritura no lanzan; un fallo
  inesperado responde "No se pudo guardar" y "se guardó pero falta la bitácora" es su propio código
  (`saved-without-audit`), que además refresca la ruta. M4: el cupo de 20 imágenes se revisa antes de
  subir y, lleno, desaparece "Agregar foto". B9: el tipo de la imagen sale de su firma real, no del
  que declara el navegador. B6: si una URL firmada vence, la imagen pide recargar. El id de clienta
  se normaliza a minúsculas, como lo guarda la base (la ruta de cada imagen debe empezar por él).
