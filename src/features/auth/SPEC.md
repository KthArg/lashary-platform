---
feature: auth
dri: pendiente
estado: terminada
actualizado: "2026-10-31"
historias:
  - id: US-AUTH-01
    estado: terminada
    evidencia: "PR #5, PR #9, PR #17, tests: admin-auth.test.tsx"
  - id: US-AUTH-02
    estado: terminada
    evidencia: "PR #3, PR #18, tests: auth-client.test.tsx, rls-isolation.test.ts"
flags: []
deuda:
  - que: "Test de aislamiento RLS contra instancia local de Supabase en CI"
    aceptada_en: "PR #3"
    costo: "2h"
  - que: "La política clients_profiles_select_own deja a la clienta leer su fila completa, notes incluido, llamando a PostgREST directo; findClientProfile ya no las pide pero la base no lo impide"
    aceptada_en: "PR #273"
    costo: "migración de privilegios por columna o vista para la clienta, más decisión del PO sobre si notes debe ser legible por ella"
defectos: []
---

# auth

Autenticación y control de acceso para la plataforma LASHARY Beauty Studio.

## Qué hace hoy

Completadas las historias `US-AUTH-01` y `US-AUTH-02`.
- Se establecen los tres roles base del sistema (`superadmin`, `admin`, `cliente`).
- Restricción de base de datos (`idx_only_one_superadmin`) garantizando un único superadmin en el sistema.
- Inicio de sesión para administradores (`US-AUTH-01`) en ruta `/admin` mediante correo y contraseña, con validación de roles en `public.auth_user_roles`.
- Guardia de rutas administrativas implementada en middleware de Edge (`src/middleware.ts`) y a nivel de servidor (`requireAdminSession`, CA-4).
- Cierre automático de sesión tras 15 minutos de inactividad de usuario (`useInactivityTimeout`, `InactivityTimeout`, CA-5).
- Navegación persistente administrativa mediante `AdminSidebar` y `layout.tsx` con accesos a dashboard, citas, clientas, catálogo (`/admin/catalog`, con pestañas Técnicas y Paquetes) y pagos (`/admin/payments`, la exoneración de anticipos de US-AGE-13), y cierre de sesión desde cualquier vista (`US-AUTH-01`, CA-2). `AdminSidebar` recibe un hueco opcional `notifications` que el layout llena con la bandeja de `notifications` (US-NOT-01); `auth` no importa nada de esa feature.
- Navegación persistente de clientas mediante `ClientSidebar` (colapsable, responsive) y `src/app/portal/layout.tsx` con accesos a citas, carrito, cuenta y cierre de sesión (`US-AUTH-02`). La página `/portal/carrito` es de `store` desde US-SHOP-01 (pieza 6/8): sus textos de relleno (`clientCartTitle`, `clientCartSubtitle`, `clientCartPlaceholder`) salieron de `auth-strings.ts`; `auth` conserva `clientCartNav` y la ruta `CLIENT_PORTAL_ROUTES.carrito`.
- Salida del portal al sitio (2026-10-31, cambio sin historia): en `ClientSidebar` el nombre LASHARY es un enlace a la portada (`SITE_HOME_ROUTE`, `/`), y al pie, sobre "Cerrar sesión", hay un enlace "Ir al sitio" (`AUTH_LABELS.clientSiteNav`, DOM-009) con ícono de casa. Hacían falta los dos: con la barra colapsada el nombre no se pinta, y el portal no tenía otra forma de volver. "Ir al sitio" va al pie y no entre Citas, Carrito y Cuenta porque saca a la clienta del portal; con la barra colapsada conserva su nombre accesible por `aria-label` y `title`, como "Cerrar sesión" (UI-004). `auth` no conoce las rutas de `landing`, así que la portada vive en su propia constante. Pruebas: `auth-client.test.tsx` (el logo lleva a la portada; "Ir al sitio" lleva a la portada y sigue con la barra colapsada).
- Inicio de sesión de clientas exclusivo vía Google OAuth con redirección a `/portal/citas` y captura modal obligatoria de teléfono post-login (`US-AUTH-02`), protegida en `src/app/portal/layout.tsx`.
- Aislamiento de datos mediante Row Level Security (RLS) en Supabase (`SEC-001`).
- Pruebas unitarias de integración automatizadas (`auth-client.test.tsx`, `admin-auth.test.tsx`).
- Pruebas de aislamiento RLS cross-cliente (`rls-isolation.test.ts`) según `SEC-002`.
- `findClientProfile` (`db/auth-repository.ts`) pide las columnas explícitas de `CLIENT_PROFILE_COLUMNS`, sin `notes`, la nota privada de la administradora; la política `clients_profiles_select_own` sigue dejando leer la fila completa por PostgREST (ver `deuda`).
- `findRole` y `findClientProfile` solo tratan como "sin fila" el código `PGRST116`; cualquier otro error de lectura lanza, así una caída de la base no se confunde con una usuaria sin rol ni niega el acceso sin dejar rastro.
- Textos y etiquetas de interfaz completamente externalizados en constantes (`auth-strings.ts`, DOM-009).
- Separación atómica de componentes UI, hooks dedicados (`useGoogleSignIn`, `usePhoneRegistration`, `useAdminLoginForm`, `useInactivityTimeout`), estilos e interfaces.
- El estado del formulario de teléfono se tipa con `PhoneRegistrationState` (`ui/client-login/types/`), una unión `{ success: true } | { success: false; error: string }` que no admite estados imposibles; `updateClientPhoneAction` devuelve ese tipo y `usePhoneRegistration` no usa `any`.
- `clientCitasTitle` / `clientCitasSubtitle` / `clientCitasPlaceholder` retirados de `auth-strings.ts`: la ruta `/portal/citas` que los usaba como placeholder ahora la compone `scheduling` (`US-AGE-03`).
- «Mis Citas» abre la lista (2026-10-31, cambio sin historia; paga la deuda «Menú lateral del portal» del SPEC de `scheduling`): el ítem apunta a `CLIENT_PORTAL_ROUTES.misCitas` (`/portal/citas/mis-citas`) y no a la pantalla de agendar. Agendar se ofrece desde la lista con un botón propio (SPEC de `scheduling`); se descartó un ítem «Agendar cita» en el menú porque el PO lo quiere dentro de la pantalla. `CLIENT_PORTAL_ROUTES.citas` no cambia de destino: lo usan la redirección después del login con Google y, por `/portal`, el «Reservar cita» de la landing, que el PO fijó en la pantalla de agendar. Cada ítem tiene un `section` además de su `href`: «Mis Citas» se marca en toda la sección `/portal/citas/…`, también al agendar, porque desde ahí se llega. El ítem activo lleva `aria-current="page"` (UI-004). Pruebas: `client-sidebar-navigation.test.tsx`.

## Contrato público (`src/features/auth/index.ts`)

Punto de entrada exportado (ARCH-003):
- Acciones y helpers: `getAuthSession()`, `requireAdminSession()`, `signInWithGoogleAction()`, `signInAdminAction()`, `signOutAction()`, `updateClientPhoneAction()`.
- Componentes UI: `GoogleSignInButton`, `PhoneRegistrationModal`, `AdminLoginForm`, `InactivityTimeout`, `AdminSidebar`, `ClientSidebar`.
- Hooks: `useGoogleSignIn`, `usePhoneRegistration`, `useAdminLoginForm`, `useInactivityTimeout`.
- Capas (plantilla de feature): `domain/roles.ts` (`AUTH_ROLES`, `isStaffRole`) y `domain/phone.ts` (`validateClientPhone`); `application/ports.ts` (puerto `AuthRepository`, `ClientProfile`), `application/session.ts` (`loadAuthSession`, `clientDisplayName`), `application/sign-in.ts` (`signInStaff`, `startGoogleSignIn`, `signOutUser`) y `application/phone.ts` (`saveClientPhone`); `db/auth-repository.ts` (`createSupabaseAuthRepository`: rol, perfil, guardado del teléfono y operaciones de `supabase.auth`); `ui/session/server-session.ts` (`getAuthSession`, `requireAdminSession`, fuera del archivo `'use server'`); `http/` vacío (el callback de OAuth vive en `src/app/auth/callback`). Las server actions de `ui/actions/` quedan delgadas sobre estas capas, sin cambiar lo que devuelven. La UI se ordena por área, como `catalog/ui/packages`: `ui/admin-login/` (`AdminLoginForm`, `useAdminLoginForm`), `ui/client-login/` (`GoogleSignInButton`, `PhoneRegistrationModal`, `useGoogleSignIn`, `usePhoneRegistration`), `ui/navigation/` (`AdminSidebar`, `ClientSidebar`) y `ui/session/` (`InactivityTimeout`, `useInactivityTimeout`), cada una con `components/<Componente>/` (`.tsx`, `.styles.ts` importado como `STYLES`, `.types.ts`, `index.ts`) y `hooks/`; textos en `ui/constants/auth-strings.ts`.
- Constantes: `AUTH_ROLES`, `AUTH_BUTTON_TEXTS`, `AUTH_LABELS`, `AUTH_ERROR_MESSAGES`, `CLIENT_PORTAL_ROUTES`, `ADMIN_PORTAL_ROUTES` (con `root: '/admin'`, la raíz del panel que `notifications` refresca al marcar un aviso).

## Invariantes de seguridad

- `superadmin`: Solo puede existir uno en el sistema (`idx_only_one_superadmin`).
- `admin`: Autenticación tradicional correo/contraseña (`US-AUTH-01`).
- `cliente`: Autenticación exclusiva vía Google OAuth (`US-AUTH-02`).
- Toda tabla vinculada a usuarios aplica RLS estricto (`SEC-001`) con prueba de aislamiento en CI (`SEC-002`).
- `SEC-007`: La mitigación de ataques de fuerza bruta se delega al Rate Limiting por IP e identificador nativo de Supabase Auth para `signInWithPassword`.
- `CA-5`: Cierre de sesión automático tras inactividad ejecutado por `InactivityTimeout` y `useInactivityTimeout`.
