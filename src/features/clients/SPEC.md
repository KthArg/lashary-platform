---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: "2026-09-15"
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
    falta: "El alta guarda en clients_profiles con createClientAction (telefono normalizado a +506, phone_verified=true), probado con Supabase simulado en clients-actions.test.ts y save-client.test.tsx. La lista sigue saliendo de constants/sample-clients.ts, asi que la clienta creada no aparece en pantalla. Faltan: leer la lista de la base, persistir la edicion (criterio 2), la unicidad de telefono (criterio 3) y la prueba de aislamiento RLS (SEC-002)."
flags: []
deuda:
  - que: "Clientas quemadas en src/features/clients/constants/sample-clients.ts: la pantalla no prueba lectura real"
    aceptada_en: "PR pendiente — rama feat/US-CLI-05-edit-client"
    costo: "1h: sustituirlo por el server action de lectura"
  - que: "ClientsList sin estados de carga ni de error (UI-003): su fuente es un arreglo en memoria"
    aceptada_en: "PR pendiente — rama feat/US-CLI-05-edit-client"
    costo: "1h al conectar la lectura real"
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
normaliza el teléfono con `normalizePhone`, guarda `phone_verified = true` y deja `user_id` en `NULL`
(clienta sin cuenta). Mientras guarda, el botón dice *Guardando…*, se deshabilita y el modal no se
cierra; si el servidor rechaza, el mensaje aparece dentro del modal y lo escrito se conserva. El error
de la base nunca llega a la pantalla: la action devuelve `{ ok: false, error }` con un texto de
`CLIENTS_ERROR_MESSAGES`. La action también llama a `requireAdminSession()`.

Debajo, `ClientsList` muestra cada clienta con un lápiz de solo icono cuyo `aria-label` la nombra
(UI-004). El lápiz abre `EditClientDialog`, el mismo modal y formulario con los datos cargados: salir
con cambios pide confirmar, el foco vuelve a ese lápiz y guardar **reporta en consola sin persistir**.

Lo único que ya funciona es el control de acceso de la capa de aplicación: la página llama a
`requireAdminSession()` de `auth`, de modo que una visitante anónima o una clienta con sesión de
Google son redirigidas a `/admin`. El middleware de Edge ya cubría `/admin/*` (salvo `/admin`
exacto), pero solo comprueba que haya sesión, no el rol — el rol lo comprueba esta página.

La estructura de carpetas sigue la distribución de `auth`: `actions/`, `components/`, `hooks/`,
`constants/`, `validation/`, `types/`, `__tests__/`; un subdirectorio por componente.

## Qué no hace todavía

**Solo el alta llega a la base.** La lista no se lee (sale de `constants/sample-clients.ts`, así que
la clienta recién creada no aparece) y la edición no se guarda. Las pruebas de la action simulan
Supabase: demuestran qué se envía, no qué permite RLS.

La tabla `public.clients_profiles` existe desde la migración
`20260901000000_auth_roles_and_clients.sql`, pero hoy solo la escribe `auth` cuando una clienta se
registra con Google, además del alta de esta feature. Le falta lo que US-CLI-05 necesita:

- restricción **única** sobre el teléfono: `idx_clients_profiles_phone` es un índice normal y no
  impide el duplicado que exige el criterio 3. Ojo: `updateClientPhoneAction` de `auth` guarda el
  teléfono sin normalizar (`+506 8888 7777`) y esta feature lo guarda como `+50688887777`; la
  unicidad solo sirve si ambos caminos escriben la misma forma;
- la prueba de aislamiento (SEC-002) de la política RLS de administradora de
  `20260911000000_clients_profiles_admin_access.sql`.

El listado con filtros y paginación **no pertenece a esta historia**: es US-CLI-01, que depende de
esta. US-CLI-05 solo necesita buscar por teléfono para detectar el duplicado.

## Contrato público (`src/features/clients/index.ts`)

Único punto de entrada (ARCH-003). Exporta `AddClientDialog` —lo que monta la ruta—, el modal, el
`ConfirmDialog`, el formulario, `AddClientButton`, `ClientsList`, `ClientRecord`, `SAMPLE_CLIENTS`, los hooks
`useClientForm` y `useFocusTrap`, `createClientAction` con su tipo `SaveClientResult`, `validateClientForm`,
`normalizePhone` y las constantes de textos y límites (DOM-009).

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
