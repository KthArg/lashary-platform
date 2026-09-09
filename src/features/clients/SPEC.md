---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: "2026-09-09"
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
    falta: "El criterio 1 existe solo como interfaz: el formulario de alta valida y reporta en consola, sin persistir. El criterio 2 tiene la lista de nombres con su accion Editar, pero sobre datos quemados en constants/sample-clients.ts y el boton todavia no abre nada. Faltan: la migracion (notes, unicidad de telefono, RLS de admin), los server actions de alta y edicion, los criterios 3 y 4, el bloqueo de navegacion al salir de la pagina con el formulario abierto, y la prueba de aislamiento RLS (SEC-002)."
flags: []
deuda:
  - que: "Cuatro clientas quemadas en src/features/clients/constants/sample-clients.ts para poder ejercitar la edicion sin base de datos; la pantalla no prueba lectura real"
    aceptada_en: "PR pendiente — rama feat/US-CLI-05-edit-client"
    costo: "1h: borrar el archivo y sustituirlo por el server action cuando exista la migracion"
  - que: "ClientsList no tiene estados de carga ni de error (UI-003) porque su fuente es un arreglo en memoria"
    aceptada_en: "PR pendiente — rama feat/US-CLI-05-edit-client"
    costo: "1h al conectar la lectura real"
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

Lo único que ya funciona es el control de acceso de la capa de aplicación: la página llama a
`requireAdminSession()` de `auth`, de modo que una visitante anónima o una clienta con sesión de
Google son redirigidas a `/admin`. El middleware de Edge ya cubría `/admin/*` (salvo `/admin`
exacto), pero solo comprueba que haya sesión, no el rol — el rol lo comprueba esta página.

Debajo del encabezado, `ClientsList` muestra una fila por clienta con su nombre y un botón de **solo
icono** —un lápiz en SVG inline, porque el proyecto no tiene librería de iconos y no se trae una por
esto—. Nada más: filtros, búsqueda y paginación son US-CLI-01. Sin texto visible, el `aria-label` es
el **único** nombre del botón, y por eso nombra a la clienta (`Editar a <nombre>`): cuatro lápices
idénticos son indistinguibles en un lector de pantalla (UI-004). El área táctil es de 40×40 aunque
el icono mida 16. **Las cuatro clientas están quemadas** en `constants/sample-clients.ts` y el botón
todavía no abre nada.

La estructura de carpetas sigue la distribución de `auth`: `actions/`, `components/`, `hooks/`,
`constants/`, `validation/`, `types/`, `__tests__/`; un subdirectorio por componente con su
`.styles.ts` y `.types.ts`. Dentro de `components/` hay una carpeta **`shared/`** con las piezas
reutilizables entre flujos de la feature —`ClientModal`, `ClientForm` y `ConfirmDialog`—. Esa
`shared/` es **de la feature**, no `src/shared/` del proyecto: nada de esto es reutilizable fuera de
`clients` todavía, y ARCH-007 reserva `src/shared/` para código sin reglas de negocio.

## Qué no hace todavía

**Se detiene antes de la base de datos.** Nada se guarda, nada se lee, nada se edita.

La tabla `public.clients_profiles` existe desde la migración
`20260901000000_auth_roles_and_clients.sql`, pero hoy solo la escribe `auth` cuando una clienta se
registra con Google. Le falta lo que US-CLI-05 necesita:

- columna para las notas generales de la administradora (criterio 1);
- restricción **única** sobre el teléfono: `idx_clients_profiles_phone` es un índice normal y no
  impide el duplicado que exige el criterio 3;
- **política RLS que permita a una administradora leer y escribir filas ajenas.** Las políticas
  vigentes son `auth.uid() = user_id`, así que hoy la administradora no puede ver ninguna clienta.
  Mientras esa política no exista, la pantalla no tiene datos que mostrar (SEC-001).

El listado con filtros y paginación **no pertenece a esta historia**: es US-CLI-01, que depende de
esta. US-CLI-05 solo necesita buscar por teléfono para detectar el duplicado.

## Contrato público (`src/features/clients/index.ts`)

Único punto de entrada (ARCH-003). Exporta `AddClientDialog` —lo que consume la ruta—,
`AddClientButton`, `ClientsList`, y las piezas reutilizables `ClientModal`, `ClientForm`,
`ClientFormField` y `ConfirmDialog`. Los hooks `useClientForm`, `useClientFormDialog` y
`useFocusTrap`; `validateClientForm`; el tipo `ClientRecord` y los datos temporales `SAMPLE_CLIENTS`;
y las constantes de textos, etiquetas ARIA, claves de campo y límites: ningún texto visible vive en
el JSX (DOM-009).

## Invariantes

- **La sección es exclusiva de la administradora.** `/admin/clients` exige rol `admin` o
  `superadmin` vía `requireAdminSession()`. Esa comprobación es el mensaje de error amable; la
  defensa real es la política RLS de la tabla (SEC-001), y esa política todavía no existe.
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
