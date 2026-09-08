---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: "2026-09-08"
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
    falta: "El criterio 1 existe solo como interfaz: el formulario de alta valida y reporta en consola, sin persistir. Faltan: la migracion (notes, unicidad de telefono, RLS de admin), el server action, los criterios 2, 3 y 4, y el bloqueo de navegacion al salir de la pagina con el formulario abierto, y todas las pruebas incluida la de aislamiento RLS (SEC-002)."
flags: []
deuda:
  - que: "El ConfirmDialog compartido es el unico elemento con esquinas redondeadas: el resto del sistema es rounded-none. Falta decidir si el radio se adopta como token global o se revierte (UI-001)"
    aceptada_en: "pendiente de PR"
    costo: "1h"
defectos: []
---

# clients

Gestion de clientas: ficha, historial, anotaciones, expediente sensible (SEC-006).

## Qué hace hoy

Existe la ruta `/admin/clients` con el encabezado de la sección y un botón **Agregar** que abre el
modal de alta. El formulario captura nombre, teléfono, correo y notas, valida al enviar y marca en
rojo los campos que faltan con su mensaje; con el formulario válido **imprime el alta en consola y
no persiste nada**. El modal no cierra al clic fuera: la única salida es Cancelar o Escape, y con
datos escritos ambas abren un diálogo de confirmación propio del proyecto — `ConfirmDialog` de
`src/shared/components` —, con la salida segura como acción por defecto y el foco puesto en ella.

Lo único que ya funciona es el control de acceso de la capa de aplicación: la página llama a
`requireAdminSession()` de `auth`, de modo que una visitante anónima o una clienta con sesión de
Google son redirigidas a `/admin`. El middleware de Edge ya cubría `/admin/*` (salvo `/admin`
exacto), pero solo comprueba que haya sesión, no el rol — el rol lo comprueba esta página.

La estructura de carpetas sigue la distribución de `auth`: `actions/`, `components/`, `hooks/`,
`constants/`, `validation/`, `types/`, `__tests__/`; un subdirectorio por componente con su
`.styles.ts` y `.types.ts`.

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

Único punto de entrada (ARCH-003). Exporta `AddClientDialog` — lo que consume la ruta —,
`AddClientButton`, `AddClientModal`, `AddClientForm`, `ClientFormField`, el hook
`useAddClientForm`, `validateClientForm` y las constantes de textos, claves de campo y límites:
ningún texto visible vive en el JSX (DOM-009).

Hacia fuera, la feature consume `ConfirmDialog` desde `@/shared/components`. `shared/` no es una
feature: no la alcanza ARCH-003 y su entry point es esa carpeta, no un `index.ts` de feature.

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
- **2026-09-08 — La confirmación de descarte deja de ser `window.confirm`.** Un iframe sandbox sin
  `allow-modals` —el navegador integrado de VS Code, entre otros— **ignora la llamada y devuelve
  `false`**, con lo que la guarda `if (isDirty && !window.confirm(...)) return` nunca dejaba cerrar
  el modal. La reemplaza `ConfirmDialog`, en `src/shared/components/` porque no tiene ninguna regla
  del estudio: recibe título, mensaje y etiquetas por props (ARCH-007, DOM-009). Es el primer
  componente del catálogo compartido. Prueba: `discard-confirmation.test.tsx`.
- **2026-09-08 — `ConfirmDialog` lleva esquinas redondeadas (`rounded-md`) por pedido explícito,
  contra el `rounded-none` del resto del sistema.** Queda anotado como deuda: o el radio se adopta
  como token global del tema y se propaga, o este componente vuelve a esquinas rectas. Mantener un
  único elemento redondeado es exactamente la inconsistencia que UI-001 existe para evitar.
