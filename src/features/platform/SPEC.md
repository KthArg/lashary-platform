---
feature: platform
dri: pendiente
estado: terminada
actualizado: 2026-09-01
historias:
  []
flags: []
deuda: []
defectos: []
---

# platform

Fundación técnica de la plataforma LASHARY Beauty Studio (ADR-0007).

## Qué hace hoy

Completada la infraestructura base:
- Entorno Next.js 16 (App Router), TypeScript y configuración de alias `@/*`.
- Configuración de estilos Tailwind CSS v3 y DaisyUI v4 con paleta y tokens del estudio LASHARY.
- Helpers compartidos de Supabase (`@/shared/lib/supabase`) para Server Components, Client Components y Middleware de refresco de sesión.
- Suite de pruebas automatizadas con Vitest y Happy-DOM.
- Configuración de Supabase local (`supabase/config.toml`).

## Contrato público (`src/features/platform/index.ts`)

Sin contrato de dominio; expone infraestructura compartida a través de `src/shared/`.
