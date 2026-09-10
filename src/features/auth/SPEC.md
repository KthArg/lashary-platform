---
feature: auth
dri: pendiente
estado: terminada
actualizado: "2026-09-10"
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
- Navegación persistente administrativa mediante `AdminSidebar` y `layout.tsx` para cierre de sesión desde cualquier vista (`US-AUTH-01`, CA-2).
- Navegación persistente de clientas mediante `ClientSidebar` y `src/app/portal/layout.tsx` con accesos a citas, carrito, cuenta y cierre de sesión (`US-AUTH-02`).
- Inicio de sesión de clientas exclusivo vía Google OAuth con redirección a `/portal/citas` y captura modal obligatoria de teléfono post-login (`US-AUTH-02`).
- Aislamiento de datos mediante Row Level Security (RLS) en Supabase (`SEC-001`).
- Pruebas unitarias de integración automatizadas (`auth-client.test.tsx`, `admin-auth.test.tsx`).
- Pruebas de aislamiento RLS cross-cliente (`rls-isolation.test.ts`) según `SEC-002`.
- Textos y etiquetas de interfaz externalizados en constantes (`auth-strings.ts`, DOM-009).
- Separación atómica de componentes UI, hooks dedicados (`useGoogleSignIn`, `usePhoneRegistration`, `useAdminLoginForm`, `useInactivityTimeout`), estilos e interfaces.

## Contrato público (`src/features/auth/index.ts`)

Punto de entrada exportado (ARCH-003):
- Acciones y helpers: `getAuthSession()`, `requireAdminSession()`, `signInWithGoogleAction()`, `signInAdminAction()`, `signOutAction()`, `updateClientPhoneAction()`.
- Componentes UI: `GoogleSignInButton`, `PhoneRegistrationModal`, `AdminLoginForm`, `InactivityTimeout`, `AdminSidebar`, `ClientSidebar`.
- Hooks: `useGoogleSignIn`, `usePhoneRegistration`, `useAdminLoginForm`, `useInactivityTimeout`.
- Constantes: `AUTH_ROLES`, `AUTH_BUTTON_TEXTS`, `AUTH_LABELS`, `AUTH_ERROR_MESSAGES`.

## Invariantes de seguridad

- `superadmin`: Solo puede existir uno en el sistema (`idx_only_one_superadmin`).
- `admin`: Autenticación tradicional correo/contraseña (`US-AUTH-01`).
- `cliente`: Autenticación exclusiva vía Google OAuth (`US-AUTH-02`).
- Toda tabla vinculada a usuarios aplica RLS estricto (`SEC-001`) con prueba de aislamiento en CI (`SEC-002`).
- `SEC-007`: La mitigación de ataques de fuerza bruta se delega al Rate Limiting por IP e identificador nativo de Supabase Auth para `signInWithPassword`.
- `CA-5`: Cierre de sesión automático tras inactividad ejecutado por `InactivityTimeout` y `useInactivityTimeout`.
