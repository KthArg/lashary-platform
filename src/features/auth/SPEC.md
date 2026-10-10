---
feature: auth
dri: pendiente
estado: terminada
actualizado: "2026-10-09"
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
- Navegación persistente administrativa mediante `AdminSidebar` y `layout.tsx` con accesos a dashboard, citas, clientas y catálogo (`/admin/catalog`, con pestañas Técnicas y Paquetes), y cierre de sesión desde cualquier vista (`US-AUTH-01`, CA-2).
- Navegación persistente de clientas mediante `ClientSidebar` (colapsable, responsive) y `src/app/portal/layout.tsx` con accesos a citas, carrito, cuenta y cierre de sesión (`US-AUTH-02`).
- Inicio de sesión de clientas exclusivo vía Google OAuth con redirección a `/portal/citas` y captura modal obligatoria de teléfono post-login (`US-AUTH-02`), protegida en `src/app/portal/layout.tsx`.
- Aislamiento de datos mediante Row Level Security (RLS) en Supabase (`SEC-001`).
- Pruebas unitarias de integración automatizadas (`auth-client.test.tsx`, `admin-auth.test.tsx`).
- Pruebas de aislamiento RLS cross-cliente (`rls-isolation.test.ts`) según `SEC-002`.
- Textos y etiquetas de interfaz completamente externalizados en constantes (`auth-strings.ts`, DOM-009).
- Separación atómica de componentes UI, hooks dedicados (`useGoogleSignIn`, `usePhoneRegistration`, `useAdminLoginForm`, `useInactivityTimeout`), estilos e interfaces.
- `clientCitasTitle` / `clientCitasSubtitle` / `clientCitasPlaceholder` retirados de `auth-strings.ts`: la ruta `/portal/citas` que los usaba como placeholder ahora la compone `scheduling` (`US-AGE-03`).

## Contrato público (`src/features/auth/index.ts`)

Punto de entrada exportado (ARCH-003):
- Acciones y helpers: `getAuthSession()`, `requireAdminSession()`, `signInWithGoogleAction()`, `signInAdminAction()`, `signOutAction()`, `updateClientPhoneAction()`.
- Componentes UI: `GoogleSignInButton`, `PhoneRegistrationModal`, `AdminLoginForm`, `InactivityTimeout`, `AdminSidebar`, `ClientSidebar`.
- Hooks: `useGoogleSignIn`, `usePhoneRegistration`, `useAdminLoginForm`, `useInactivityTimeout`.
- Capas (plantilla de feature): `domain/roles.ts` (`AUTH_ROLES`, `isStaffRole`) y `domain/phone.ts` (`validateClientPhone`); `application/ports.ts` (puerto `AuthRepository`, `ClientProfile`), `application/session.ts` (`loadAuthSession`, `clientDisplayName`), `application/sign-in.ts` (`signInStaff`, `startGoogleSignIn`, `signOutUser`) y `application/phone.ts` (`saveClientPhone`); `db/auth-repository.ts` (`createSupabaseAuthRepository`: rol, perfil, guardado del teléfono y operaciones de `supabase.auth`; `findClientProfile` pide las columnas explícitas de `CLIENT_PROFILE_COLUMNS`, sin `notes`, la nota privada de la administradora); `ui/session/server-session.ts` (`getAuthSession`, `requireAdminSession`, fuera del archivo `'use server'`); `http/` vacío (el callback de OAuth vive en `src/app/auth/callback`). Las server actions de `ui/actions/` quedan delgadas sobre estas capas, sin cambiar lo que devuelven. La UI se ordena por área, como `catalog/ui/packages`: `ui/admin-login/` (`AdminLoginForm`, `useAdminLoginForm`), `ui/client-login/` (`GoogleSignInButton`, `PhoneRegistrationModal`, `useGoogleSignIn`, `usePhoneRegistration`), `ui/navigation/` (`AdminSidebar`, `ClientSidebar`) y `ui/session/` (`InactivityTimeout`, `useInactivityTimeout`), cada una con `components/<Componente>/` (`.tsx`, `.styles.ts` importado como `STYLES`, `.types.ts`, `index.ts`) y `hooks/`; textos en `ui/constants/auth-strings.ts`.
- Constantes: `AUTH_ROLES`, `AUTH_BUTTON_TEXTS`, `AUTH_LABELS`, `AUTH_ERROR_MESSAGES`, `CLIENT_PORTAL_ROUTES`, `ADMIN_PORTAL_ROUTES`.

## Invariantes de seguridad

- `superadmin`: Solo puede existir uno en el sistema (`idx_only_one_superadmin`).
- `admin`: Autenticación tradicional correo/contraseña (`US-AUTH-01`).
- `cliente`: Autenticación exclusiva vía Google OAuth (`US-AUTH-02`).
- Toda tabla vinculada a usuarios aplica RLS estricto (`SEC-001`) con prueba de aislamiento en CI (`SEC-002`).
- `SEC-007`: La mitigación de ataques de fuerza bruta se delega al Rate Limiting por IP e identificador nativo de Supabase Auth para `signInWithPassword`.
- `CA-5`: Cierre de sesión automático tras inactividad ejecutado por `InactivityTimeout` y `useInactivityTimeout`.
