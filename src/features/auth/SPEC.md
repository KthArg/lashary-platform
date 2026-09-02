---
feature: auth
dri: pendiente
estado: terminada
actualizado: "2026-09-01"
historias:
  - id: US-AUTH-01
    estado: terminada
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

Completado para `US-AUTH-01` y en progreso para `US-AUTH-02`.
- Se establecen los tres roles base del sistema (`superadmin`, `admin`, `cliente`).
- Restricción de base de datos (`idx_only_one_superadmin`) garantizando un único superadmin en el sistema.
- Inicio de sesión para administradores (`US-AUTH-01`) en ruta `/admin` mediante correo y contraseña, con validación de roles en `public.auth_user_roles`.
- Guardia de protección de rutas administrativas (`requireAdminSession`, CA-4).
- Inicio de sesión de clientas exclusivo vía Google OAuth con captura modal obligatoria de teléfono post-login (`US-AUTH-02`).
- Aislamiento de datos mediante Row Level Security (RLS) en Supabase (`SEC-001`).
- Pruebas unitarias de integración automatizadas (`auth-client.test.tsx`, `admin-auth.test.tsx`).
- Pruebas de aislamiento RLS cross-cliente (`rls-isolation.test.ts`) según `SEC-002`.
- Textos y etiquetas de interfaz externalizados en constantes (`auth-strings.ts`, DOM-009).

## Contrato público (`src/features/auth/index.ts`)

Punto de entrada exportado (ARCH-003):
- `getAuthSession()`: Helper server-side para obtener la sesión autenticada actual, rol y perfil.
- `requireAdminSession()`: Guardia server-side para proteger rutas administrativas.
- `signInWithGoogleAction()`: Server action para autenticación OAuth con Google.
- `signInAdminAction()`: Server action para autenticación correo/contraseña de administradores.
- `signOutAction()`: Server action para invalidar la sesión y redirigir.
- `updateClientPhoneAction()`: Server action para actualizar teléfono obligatorio.
- `GoogleSignInButton`: Componente UI para iniciar sesión con Google.
- `PhoneRegistrationModal`: Componente UI modal post-login para registrar teléfono.
- `AdminLoginForm`: Componente UI para formulario de autenticación administrativa.
- `AUTH_BUTTON_TEXTS`, `AUTH_LABELS`, `AUTH_ERROR_MESSAGES`: Constantes de textos de interfaz.

## Invariantes de seguridad

- `superadmin`: Solo puede existir uno en el sistema (`idx_only_one_superadmin`).
- `admin`: Autenticación tradicional correo/contraseña (`US-AUTH-01`).
- `cliente`: Autenticación exclusiva vía Google OAuth (`US-AUTH-02`).
- Toda tabla vinculada a usuarios aplica RLS estricto (`SEC-001`) con prueba de aislamiento en CI (`SEC-002`).
- `SEC-007`: La mitigación de ataques de fuerza bruta se delega al Rate Limiting por IP e identificador nativo de Supabase Auth para `signInWithPassword`.
- `CA-5`: El cierre de sesión tras inactividad es administrado por el ciclo de vida del JWT y la expiración de cookies en el middleware de Supabase.
