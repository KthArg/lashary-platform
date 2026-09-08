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
    falta: "El criterio 1 existe solo como interfaz: el formulario de alta valida y reporta en consola, sin persistir, y se monta en la pagina porque el modal salio a su propio PR. Faltan: la migracion (notes, unicidad de telefono, RLS de admin), el server action, el modal y su confirmacion al descartar, los criterios 2, 3 y 4, el bloqueo de navegacion, y todas las pruebas incluida la de aislamiento RLS (SEC-002)."
flags: []
deuda: []
defectos: []
---

# clients

Gestion de clientas: ficha, historial, anotaciones, expediente sensible (SEC-006).

## Qué hace hoy

Existe la ruta `/admin/clients` con el encabezado de la sección y, debajo, el formulario de alta
montado directamente en la página. Captura nombre, teléfono, correo y notas, valida al enviar y
marca en rojo los campos que faltan con su mensaje; con el formulario válido **imprime el alta en
consola y no persiste nada**.

**No hay modal todavía.** El botón *Agregar*, el modal y la confirmación al descartar existen y
funcionan, pero viven en la rama `feat/US-CLI-05-confirm-dialog` y entran por su propio PR: juntarlos
con el formulario llevaba el diff por encima del tope de INT-002.

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

Único punto de entrada (ARCH-003). Exporta `AddClientForm` — lo que consume la ruta —,
`ClientFormField`, el hook `useAddClientForm`, `validateClientForm` y las constantes de textos,
claves de campo y límites: ningún texto visible vive en el JSX (DOM-009). `AddClientButton`,
`AddClientModal` y `AddClientDialog` volverán al contrato con el PR del modal.

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
- **2026-09-08 — El modal sale de este PR y el formulario se monta en la página.** El diff de la
  rama llegaba a 482 líneas contra un tope de 400 (INT-002). Se revirtió el `ConfirmDialog`
  compartido y se sacaron `AddClientButton`, `AddClientModal` y `AddClientDialog`, que vuelven en el
  PR de la rama `feat/US-CLI-05-confirm-dialog`. **Consecuencia asumida:** mientras tanto no hay
  confirmación al descartar el formulario en curso, así que salir de la página pierde lo escrito.
