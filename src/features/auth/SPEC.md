---
feature: auth
dri: pendiente
estado: en_progreso
actualizado: "2026-09-01"
historias:
  - id: US-AUTH-01
    estado: no_iniciada
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

En progreso para `US-AUTH-02`. 
- Se establecen los tres roles base del sistema (`superadmin`, `admin`, `cliente`).
- Inicio de sesión de clientas exclusivo vía Google OAuth con captura modal obligatoria de teléfono post-login (`US-CLI-05`).
- Aislamiento de datos mediante Row Level Security (RLS) en Supabase (`SEC-001`).
- Pruebas unitarias de integración automatizadas (`auth-client.test.tsx`).
- Pruebas de aislamiento RLS cross-cliente (`rls-isolation.test.ts`) según `SEC-002`.
- Textos y etiquetas de interfaz externalizados en constantes (`auth-strings.ts`, DOM-009).

## Contrato público (`src/features/auth/index.ts`)

Punto de entrada exportado (ARCH-003):
- `getAuthSession()`: Helper server-side para obtener la sesión autenticada actual y el rol del usuario.
- `signInWithGoogleAction()`: Server action para autenticación OAuth con Google.
- `signOutAction()`: Server action para invalidar la sesión y redirigir.
- `updateClientPhoneAction()`: Server action para guardar teléfono obligatorio.
- `GoogleSignInButton`: Componente UI para iniciar sesión con Google.
- `PhoneRegistrationModal`: Componente UI modal post-login para registrar teléfono.
- `AUTH_BUTTON_TEXTS`, `AUTH_LABELS`, `AUTH_ERROR_MESSAGES`: Constantes de textos de interfaz.

## Invariantes de seguridad

- `superadmin`: Solo asignable mediante consola / SQL directo en la base de datos de Supabase.
- `admin`: Autenticación tradicional correo/contraseña (`US-AUTH-01`).
- `cliente`: Autenticación exclusiva vía Google OAuth (`US-AUTH-02`).
- Toda tabla vinculada a usuarios aplica RLS estricto (`SEC-001`) con prueba de aislamiento en CI (`SEC-002`).
