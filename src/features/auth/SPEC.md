---
feature: auth
dri: pendiente
estado: en_progreso
actualizado: "2026-09-06"
historias:
  - id: US-AUTH-01
    estado: en_progreso
    falta: "Implementar invocación de guardia en middleware para protección de rutas (CA-4) y timeout de inactividad de sesión (CA-5)"
    evidencia: "PR #5"
  - id: US-AUTH-02
    estado: en_progreso
    falta: "Aprobación y merge del PR #3"
    evidencia: "PR #3"
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

En progreso para `US-AUTH-01` (login implementado; guardia de rutas y timeout diferidos) y para `US-AUTH-02`.
- Se establecen los tres roles base del sistema (`superadmin`, `admin`, `cliente`).
- Restricción de base de datos (`idx_only_one_superadmin`) garantizando un único superadmin en el sistema.
- Inicio de sesión para administradores (`US-AUTH-01`) en ruta `/admin` mediante correo y contraseña, con validación de roles en `public.auth_user_roles`.
- Guardia de rutas administrativas implementada (`requireAdminSession`, CA-4), pendiente de invocación en rutas protegidas reales.
- Inicio de sesión de clientas exclusivo vía Google OAuth con captura modal obligatoria de teléfono post-login (`US-AUTH-02`).
- Aislamiento de datos mediante Row Level Security (RLS) en Supabase (`SEC-001`).
- Pruebas unitarias de integración automatizadas (`auth-client.test.tsx`, `admin-auth.test.tsx`).
- Pruebas de aislamiento RLS cross-cliente (`rls-isolation.test.ts`) según `SEC-002`.
- Textos y etiquetas de interfaz externalizados en constantes (`auth-strings.ts`, DOM-009).
- Separación atómica de componentes UI, hooks dedicados (`useGoogleSignIn`, `usePhoneRegistration`, `useAdminLoginForm`), estilos e interfaces.

## Contrato público (`src/features/auth/index.ts`)

Punto de entrada exportado (ARCH-003):
- Acciones y helpers: `getAuthSession()`, `requireAdminSession()`, `signInWithGoogleAction()`, `signInAdminAction()`, `signOutAction()`, `updateClientPhoneAction()`.
- Componentes UI: `GoogleSignInButton`, `PhoneRegistrationModal`, `AdminLoginForm`.
- Hooks: `useGoogleSignIn`, `usePhoneRegistration`, `useAdminLoginForm`.
- Constantes: `AUTH_ROLES`, `AUTH_BUTTON_TEXTS`, `AUTH_LABELS`, `AUTH_ERROR_MESSAGES`.

## Invariantes de seguridad

- `superadmin`: Solo puede existir uno en el sistema (`idx_only_one_superadmin`).
- `admin`: Autenticación tradicional correo/contraseña (`US-AUTH-01`).
- `cliente`: Autenticación exclusiva vía Google OAuth (`US-AUTH-02`).
- Toda tabla vinculada a usuarios aplica RLS estricto (`SEC-001`) con prueba de aislamiento en CI (`SEC-002`).
- `SEC-007`: La mitigación de ataques de fuerza bruta se delega al Rate Limiting por IP e identificador nativo de Supabase Auth para `signInWithPassword`.
- `CA-5`: El cierre de sesión tras inactividad está diferido a la implementación de temporizador en middleware; actualmente Supabase refresca el JWT en actividad.
