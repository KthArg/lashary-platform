---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: "2026-09-12"
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
    falta: "El formulario de alta valida y reporta en consola, pero ninguna ruta lo monta. Faltan: el modal que lo abre desde /admin/clients, la migracion (notes, unicidad de telefono), el server action, los criterios 2, 3 y 4, y la prueba de aislamiento RLS (SEC-002)."
flags: []
deuda: []
defectos: []
---

# clients

Gestion de clientas: ficha, historial, anotaciones, expediente sensible (SEC-006).

## Qué hace hoy

Existe la ruta `/admin/clients`, dentro del panel de administración. Renderiza el encabezado de la
sección y nada más: no lee ni escribe una sola clienta. El formulario de alta (`AddClientForm`) y su
validación ya existen, pero **ninguna ruta los monta**: el modal que los abre llega en el PR siguiente.

Lo único que ya funciona es el control de acceso de la capa de aplicación: la página llama a
`requireAdminSession()` de `auth`, de modo que una visitante anónima o una clienta con sesión de
Google son redirigidas a `/admin`. El middleware de Edge ya cubría `/admin/*` (salvo `/admin`
exacto), pero solo comprueba que haya sesión, no el rol — el rol lo comprueba esta página.

La estructura de carpetas sigue la distribución de `auth`: `actions/`, `components/`, `hooks/`,
`constants/`, `validation/`, `types/`, `__tests__/`; un subdirectorio por componente.

## Qué no hace todavía

**Se detiene antes de montar el alta y de la base de datos.** Nada se muestra, nada se guarda.

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

Único punto de entrada (ARCH-003). Exporta el formulario, `AddClientButton`, los hooks
`useAddClientForm` y `useFocusTrap`, `validateClientForm` y las constantes de textos y límites (DOM-009).

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
- **2026-09-07 — El criterio 1 se entrega primero solo como interfaz** y **no está cumplido** hasta
  que escriba en la base con su prueba. `email` es obligatorio: `clients_profiles.email` es `NOT NULL`.
- **2026-09-08 — El estado de errores borra la clave, no la vacía**; si sobrevive, el resumen rojo no
  se retira. Cubierto por `form-error-summary.test.tsx`.
- **2026-09-12 — El alta se parte en dos PRs apilados (INT-002):** este, sin montar, y el modal con
  su confirmación de descarte. `useFocusTrap` entra aquí; su prueba llega con el modal que lo usa.
