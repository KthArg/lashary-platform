---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: "2026-09-10"
historias:
  - id: US-CLI-01
    estado: no_iniciada
  - id: US-CLI-02
    estado: no_iniciada
  - id: US-CLI-03
    estado: no_iniciada
  - id: US-CLI-04
    estado: no_iniciada
  - id: US-CLI-05
    estado: en_progreso
    falta: "El criterio 1 existe solo como interfaz: el formulario de alta valida y reporta en consola, sin persistir. El criterio 2 ya lee de la base: la lista sale de public.clients_profiles via listClients(), con la funcion auth_is_admin() y la politica clients_profiles_select_admin de la migracion 20260910000000; la edicion sigue reportando en consola sin escribir. Faltan: la unicidad de telefono, los server actions de alta y edicion, los criterios 3 y 4, el bloqueo de navegacion al salir de la pagina con el formulario abierto, y la prueba de aislamiento RLS contra Postgres (SEC-002)."
flags: []
deuda:
  - que: "La prueba de la politica clients_profiles_select_admin modela la politica en TypeScript (src/features/clients/__tests__/rls-admin-read.test.ts); no ejecuta Postgres, asi que no demuestra la politica real (SEC-002)"
    aceptada_en: "PR pendiente — rama feat/US-CLI-05-connect-db"
    costo: "3h: levantar supabase local en CI y correr la prueba con dos tokens reales"
defectos: []
---

# clients

Gestion de clientas: ficha, historial, anotaciones, expediente sensible (SEC-006).

## Qué hace hoy

Existe la ruta `/admin/clients` con el encabezado de la sección y un botón **Agregar** que abre el
modal de alta. El formulario captura nombre, teléfono, correo y notas, valida al enviar y marca en
rojo los campos que faltan con su mensaje; el resumen de errores se retira en cuanto la admin
corrige los campos. Con el formulario válido **imprime el alta en consola y no persiste nada**.

El modal no cierra al clic fuera: la única salida es Cancelar o Escape, y con datos escritos ambas
abren el `ConfirmDialog` del proyecto —no `window.confirm`, que un iframe sandbox ignora—.

**El foco queda confinado al diálogo** (UI-004): entra en el primer control al abrir, `Tab` y
`Shift+Tab` ciclan dentro de la tarjeta, y al cerrar vuelve al botón *Agregar*. Lo resuelve
`useFocusTrap`, que también usa el `ConfirmDialog`; mientras la confirmación está encima, el modal
cede la trampa con `isPaused`.

La lista tiene sus **tres estados** (UI-003): vacío y error en `ClientsList`, carga en
`src/app/admin/clients/loading.tsx`. El de carga vive en la ruta porque quien espera por la base es
el Server Component: cuando `ClientsList` se renderiza, los datos ya llegaron. El error se anuncia
con `role="alert"` y **reemplaza** al estado vacío: un fallo de lectura no es "no hay clientas".

Lo único que ya funciona es el control de acceso de la capa de aplicación: la página llama a
`requireAdminSession()` de `auth`, de modo que una visitante anónima o una clienta con sesión de
Google son redirigidas a `/admin`. El middleware de Edge ya cubría `/admin/*` (salvo `/admin`
exacto), pero solo comprueba que haya sesión, no el rol — el rol lo comprueba esta página.

Debajo del encabezado, `ClientsList` muestra una fila por clienta con su nombre y un botón de **solo
icono** —un lápiz en SVG inline, porque el proyecto no tiene librería de iconos y no se trae una por
esto—. Nada más: filtros, búsqueda y paginación son US-CLI-01. Sin texto visible, el `aria-label` es
el **único** nombre del botón, y por eso nombra a la clienta (`Editar a <nombre>`): cuatro lápices
idénticos son indistinguibles en un lector de pantalla (UI-004). El área táctil es de 40×40 aunque
el icono mida 16. **Las clientas salen de la base**: `listClients()` lee `public.clients_profiles`
ordenado por nombre y con tope de `CLIENTS_LIST_LIMIT` (PERF-002; la paginación real es US-CLI-01).
`constants/sample-clients.ts` fue borrado.

El lápiz abre `EditClientDialog`: el **mismo** modal, formulario y confirmación del alta, con los
datos de la clienta ya cargados. Salir con cambios pendientes pregunta antes de descartarlos; salir
sin haber tocado nada cierra directo. Hay un solo diálogo para toda la lista, y el formulario lleva
`key` por clienta: sin eso, pasar de una a otra reusaría el estado anterior. El foco vuelve al lápiz
de esa fila, no al principio (UI-004). Al guardar **imprime en consola y no persiste nada**.

La estructura de carpetas sigue la distribución de `auth`: `actions/`, `components/`, `hooks/`,
`constants/`, `validation/`, `types/`, `__tests__/`; un subdirectorio por componente con su
`.styles.ts` y `.types.ts`. Dentro de `components/` hay una carpeta **`shared/`** con las piezas
reutilizables entre flujos de la feature —`ClientModal`, `ClientForm` y `ConfirmDialog`—. Esa
`shared/` es **de la feature**, no `src/shared/` del proyecto: nada de esto es reutilizable fuera de
`clients` todavía, y ARCH-007 reserva `src/shared/` para código sin reglas de negocio.

## Qué no hace todavía

**Lee, pero no escribe.** La lista sale de la base; el alta y la edición siguen imprimiendo en
consola.

`20260909000000_clients_profiles_add_notes.sql` agrega la columna `notes` (criterio 1) y
`20260910000000_clients_admin_read.sql` la función `public.auth_is_admin()` y la política
`clients_profiles_select_admin` (criterio 2). Sigue faltando lo demás:

- restricción **única** sobre el teléfono: `idx_clients_profiles_phone` es un índice normal y no
  impide el duplicado que exige el criterio 3;
- **políticas de INSERT y UPDATE para la administradora.** La migración entrega solo el `SELECT`:
  sin ellas el alta y la edición no pueden escribir filas ajenas (SEC-001).

El listado con filtros y paginación **no pertenece a esta historia**: es US-CLI-01, que depende de
esta. US-CLI-05 solo necesita buscar por teléfono para detectar el duplicado.

## Contrato público (`src/features/clients/index.ts`)

Único punto de entrada (ARCH-003). Exporta `AddClientDialog` —lo que consume la ruta—,
`AddClientButton`, `EditClientDialog`, `ClientsList`, y las piezas reutilizables `ClientModal`,
`ClientForm`,
`ClientFormField` y `ConfirmDialog`. Los hooks `useClientForm`, `useClientFormDialog` y
`useFocusTrap`; `validateClientForm`; la lectura `listClients()`; los tipos `ClientRecord`,
`ClientProfileRow` y `ClientsListResult`; y las constantes de textos, etiquetas ARIA, claves de campo
y límites: ningún texto visible vive en el JSX (DOM-009).

## Invariantes

- **La sección es exclusiva de la administradora.** `/admin/clients` exige rol `admin` o
  `superadmin` vía `requireAdminSession()`. Esa comprobación es el mensaje de error amable; la
  defensa real es `clients_profiles_select_admin`, que ya existe (SEC-001): con una sesión que no
  es de administradora, esa misma consulta devuelve cero filas en vez de un error.
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
- **2026-09-07 — Pendiente del PO: qué significa "unificar" dos clientas con el mismo teléfono**
  (criterio 3). Sin esa definición el criterio no es objetivamente verificable.
- **2026-09-07 — Pendiente de acuerdo contrato-primero (INT-003): cómo comprueba esta feature que la
  sesión es de una administradora.** El dato vive en `auth_user_roles`, tabla de `auth`, y ARCH-005
  prohíbe consultarla directamente. Propuesta: función `SECURITY DEFINER` publicada por `auth`.
- **2026-09-07 — El criterio 1 se entrega primero solo como interfaz**: el alta reporta en consola
  porque la persistencia depende de la migración que aún no existe. **No está cumplido** hasta que
  escriba en la base y tenga su prueba.
- **2026-09-07 — `email` se pide obligatorio** porque `clients_profiles.email` es `NOT NULL`. Si el
  PO acepta clientas sin correo, cambia la columna y `REQUIRED_CLIENT_FIELDS`.
- **2026-09-08 — El estado de errores borra la clave, no la vacía.** La revisión del PR encontró que
  `setFieldValue` hacía `{ ...current, [field]: undefined }`: la clave sobrevivía, `Object.keys`
  seguía contándola y el resumen rojo del formulario no desaparecía aunque la admin corrigiera todo.
  Cubierto por `form-error-summary.test.tsx`, que se verificó fallando contra el código anterior.
- **2026-09-08 — El `ConfirmDialog` vive en `clients`, no en `shared/`.** Su único consumidor hoy es
  el descarte del formulario de alta. Subirlo a `shared/` con un solo consumidor inventa una API
  compartida antes de saber qué necesita el segundo. Sube cuando aparezca, no antes.
- **2026-09-08 — `useFocusTrap` cierra el hallazgo UI-004 de la revisión.** El modal declaraba
  `role="dialog"` y `aria-modal` pero el `Tab` se escapaba de la tarjeta a la página, que quedaba
  operable. Ahora el foco entra al abrir, cicla dentro y vuelve al botón *Agregar* al cerrar.
  Cubierto por `modal-focus-trap.test.tsx`, verificado fallando sin la trampa.
- **2026-09-08 — Este PR entra con excepción de proceso a INT-002.** El diff excede las ~400 líneas
  porque el modal, su confirmación, la trampa de foco y sus pruebas son una unidad funcional:
  partirlos deja mergeado un modal inaccesible. Etiqueta `excepcion-proceso` con justificación
  escrita, según `docs/spec/INTEGRATION.md#el-escape-legítimo`.
- **2026-09-08 — El criterio 2 se apoya en datos quemados, no en la base.** Editar exige clientas
  existentes y la migración con la política RLS de administradora no existe todavía (SEC-001), así
  que `constants/sample-clients.ts` trae cuatro filas en memoria. La pantalla demuestra la edición,
  **no** demuestra que la administradora pueda leer clientas reales. Registrado como deuda con su
  costo; el archivo se borra entero cuando exista el server action.
- **2026-09-08 — `ClientsList` implementa el estado vacío pero no los de carga y error** (UI-003).
  Su fuente es un arreglo en memoria: no tarda ni falla, y fabricar un spinner que nunca gira es
  teatro. Ambos entran con la lectura real. Cubierto por `clients-list.test.tsx`.
- **2026-09-09 — El modal y el formulario se generalizaron dentro de la feature.** `AddClientModal` y
  `AddClientForm` pasaron a `ClientModal` y `ClientForm` —título y valores iniciales por props— y las
  ~25 líneas de coordinación de `AddClientDialog` salieron a `useClientFormDialog`. Viven en
  `components/shared/`; **`src/shared/` del proyecto sigue intacto**. Es un refactor **sin cambio de
  comportamiento**: las 43 pruebas existentes pasan sin tocarlas.
- **2026-09-09 — `ClientModal` numera su título con `useId`** y no con una constante de módulo. Con
  dos modales en el mismo árbol, un `id` fijo se duplicaría y `aria-labelledby` apuntaría al título
  equivocado (UI-004).
- **2026-09-09 — `isDirty` compara contra los valores iniciales, no contra el vacío.** La definición
  anterior ("hay algo escrito") servía para el alta, que nace vacía, pero el formulario de edición
  nace lleno: abrirlo y cancelar sin tocar nada disparaba la confirmación de descarte, que mentía.
  Cubierto por `edit-client.test.tsx`, verificado fallando (2 pruebas) contra la definición anterior.
- **2026-09-10 — `public.auth_is_admin()` es el contrato que `auth` publica** para que `clients` no
  consulte `auth_user_roles` directo (ARCH-005). `SECURITY DEFINER` porque esa tabla tiene RLS de
  "solo mi propia fila" y sin definer la función se bloquearía a sí misma al evaluarse dentro de una
  política; `STABLE` para que se evalúe una vez por consulta y no una por fila. **Excepción a
  INT-003 asumida:** el contrato debía mergearse en su propio PR antes que esta implementación; entra
  con ella para no partir la historia en dos ramas más.
- **2026-09-10 — La política de admin entra en un PR apilado sobre `feat/US-CLI-05-edit-client`.**
  INT-008 permite máximo una migración nueva por PR y esa rama ya trae la de `notes`. CI toma la base
  del PR (`ci.yml`: `--base origin/${{ github.base_ref }}`), así que con base en la rama padre el
  rango contiene una única migración nueva y el hook local coincide con CI. Reinicia también el
  conteo de INT-002 y la edad de INT-001.
- **2026-09-10 — La política de admin es PERMISIVA y solo de `SELECT`.** Las políticas de Postgres se
  combinan con OR: `clients_profiles_select_admin` no toca lo que ve una clienta, que sigue siendo su
  propia fila. Cubierto por `rls-admin-read.test.ts` — con el límite declarado en la deuda: modela
  las políticas en TypeScript, no ejecuta Postgres (SEC-002).
- **2026-09-10 — `listClients()` no lleva `'use server'`.** Su única consumidora será la página, que
  es Server Component y la llama directo; marcarla como server action la publicaría como endpoint
  invocable desde el navegador sin que nadie lo necesite. Cubierto por `list-clients.test.ts`
  (traducción de fila, `notes` nula, lista vacía, fallo de la base y tope de PERF-002), con Supabase
  mockeado.
- **2026-09-10 — La lista consume `listClients()` y `sample-clients.ts` se borró.** Paga las dos
  deudas registradas el 2026-09-08: los datos quemados y los estados de carga y error que no tenían
  sentido sobre un arreglo en memoria. Los datos de prueba se mudaron a
  `__tests__/fixtures/clients.ts` — `TEST_CLIENTS` no lo importa nadie fuera de las pruebas, y
  `supabase/seed.sql` cubre el desarrollo local, que es lo que el dato quemado hacía de facto.
  Cubierto por `clients-list.test.tsx` (el estado de error reemplaza al vacío).
