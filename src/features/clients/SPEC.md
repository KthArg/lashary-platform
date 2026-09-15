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
    falta: "El alta (criterios 1, 3 y 4) y la lectura de la lista usan clients_profiles, probados con Supabase simulado en clients-actions.test.ts, list-clients.test.ts, save-client.test.tsx y clients-list.test.tsx. Faltan: persistir la edicion (criterio 2, que debe repetir la revision de telefono excluyendo a la propia clienta) y la prueba de aislamiento RLS (SEC-002)."
flags: []
deuda: []
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

Debajo, `ClientsList` muestra las clientas que la página lee en el servidor con `listClientsAction()`:
la primera página de 50 (`CLIENTS_LIST_LIMITS`), las más recientes primero y solo las columnas que
muestra (PERF-002, PERF-005). Tiene sus tres estados (UI-003): carga en
`src/app/admin/clients/loading.tsx` (`role="status"`), error con *Reintentar* (`router.refresh()`) y
vacío que sugiere *Agregar*. Tras un alta, `revalidatePath` vuelve a leer y la clienta nueva aparece.

Cada clienta tiene un lápiz de solo icono cuyo `aria-label` la nombra (UI-004). El lápiz abre
`EditClientDialog`, el mismo modal y formulario con los datos cargados: salir con cambios pide
confirmar, el foco vuelve a ese lápiz y guardar **reporta en consola sin persistir**.

Control de acceso de la capa de aplicación: la página y cada action llaman a
`requireAdminSession()` de `auth`, de modo que una visitante anónima o una clienta con sesión de
Google son redirigidas a `/admin`. El middleware de Edge ya cubría `/admin/*` (salvo `/admin`
exacto), pero solo comprueba que haya sesión, no el rol — el rol lo comprueba esta página.

La estructura de carpetas sigue la distribución de `auth`: `actions/`, `components/`, `hooks/`,
`constants/`, `validation/`, `types/`, `__tests__/`; un subdirectorio por componente.

## Qué no hace todavía

**La edición no se guarda.** El alta y la lectura ya usan la base; *Guardar* en `EditClientDialog`
todavía reporta en consola. Las pruebas de las actions simulan Supabase: demuestran qué se envía y
se lee, no qué permite RLS.

La tabla `public.clients_profiles` existe desde la migración
`20260901000000_auth_roles_and_clients.sql`, pero hoy solo la escribe `auth` cuando una clienta se
registra con Google, además del alta de esta feature. Le falta lo que US-CLI-05 necesita:

- la edición guardada (criterio 2) debe repetir la revisión de teléfono, excluyendo a la propia
  clienta;
- la prueba de aislamiento (SEC-002) de la política RLS de administradora de
  `20260911000000_clients_profiles_admin_access.sql`.

El listado con filtros y paginación **no pertenece a esta historia**: es US-CLI-01, que depende de
esta. US-CLI-05 solo necesita buscar por teléfono para detectar el duplicado.

## Contrato público (`src/features/clients/index.ts`)

Único punto de entrada (ARCH-003). Exporta `AddClientDialog` —lo que monta la ruta—, el modal, el
`ConfirmDialog`, el formulario, `AddClientButton`, `ClientsList`, `ClientRecord`, los hooks
`useClientForm` y `useFocusTrap`, `createClientAction` y `listClientsAction` con sus tipos
`SaveClientResult` y `ListClientsResult`, `validateClientForm`, `normalizePhone` y las constantes de
textos y límites, entre ellas `CLIENTS_LIST_LIMITS` (DOM-009).

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
