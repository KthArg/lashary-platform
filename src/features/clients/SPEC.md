---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: "2026-09-20"
historias:
  - id: US-CLI-01
    estado: en_progreso
    falta: "las columnas de morosidad y ultima cita existen sin dato y no tienen filtro: el dato espera a US-MOR-01 y el de ultima cita a US-AGE-05 (criterios diferidos); tambien falta extraer la construccion de URLs del listado a un hook, hoy duplicada en ClientsPagination y ClientsNameFilter"
  - id: US-CLI-02
    estado: no_iniciada
  - id: US-CLI-03
    estado: no_iniciada
  - id: US-CLI-04
    estado: no_iniciada
  - id: US-CLI-05
    estado: terminada
    evidencia: "PR #16, PR #28, PR #31, PR #32, tests: clients-actions.test.ts, save-client.test.tsx, list-clients.test.ts, clients-list.test.tsx, update-client.test.ts, edit-client.test.tsx"
flags: []
deuda:
  - que: "La construccion de URLs del listado esta duplicada en src/features/clients/components/ClientsPagination/ClientsPagination.tsx y src/features/clients/components/ClientsNameFilter/ClientsNameFilter.tsx: copiar la consulta actual, cambiar un parametro y borrar page"
    aceptada_en: "pieza feat/US-CLI-01-name-filter"
    costo: "1h: extraer una funcion pura de construccion de URL mas un hook que la use, y mover a la funcion pura las pruebas de URL de clients-pagination.test.tsx y clients-name-filter.test.tsx"
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

La estructura de carpetas sigue la distribución de `auth`: `actions/`, `components/`, `hooks/`,
`constants/`, `validation/`, `types/`, `__tests__/`; un subdirectorio por componente.

## Qué no hace todavía

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
También exporta `ClientsPagination` y `ClientsNameFilter`.

## Invariantes

- **La sección es exclusiva de la administradora.** `/admin/clients` exige rol `admin` o
  `superadmin` vía `requireAdminSession()`. Esa comprobación es el mensaje de error amable; la
  defensa real es la política RLS de la tabla (SEC-001), que aún no tiene prueba de aislamiento.
- **Toda tabla de esta feature lleva el prefijo `clients_`** (ARCH-006) y RLS activo con su prueba
  de aislamiento cross-cliente en CI (SEC-002).
- **El teléfono identifica a una clienta.** No pueden coexistir dos con el mismo número (criterio 3).
- **Una clienta creada a mano por la administradora nace con el teléfono verificado** (criterio 4).
- **El expediente es dato sensible** (SEC-006): cuando llegue US-CLI-04, su acceso es solo de la
  administradora, queda en la bitácora y sus imágenes no son públicas por URL. No aplica todavía.

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
- **2026-09-20 — La columna de acciones lleva encabezado visible**, no `sr-only` como nació el
  2026-09-20 en esta misma pieza (decisión de José Loría). UI-004 se cumple igual: la columna tiene
  nombre accesible; ahora además se ve.
