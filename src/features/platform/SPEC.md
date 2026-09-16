---
feature: platform
dri: pendiente
estado: terminada
actualizado: "2026-09-16"
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
- Pruebas e2e con Playwright 1.63.0 (version fija) contra el build de produccion: `npm run test:e2e`, configuracion en `playwright.config.ts`, pruebas en `e2e/`, solo Chromium. En CI, job `pruebas e2e (playwright)`. La porta US-LAND-01 (criterio 2, "visible"); los anchos viven en `e2e/support/viewports.ts`.
- Configuración de Supabase local (`supabase/config.toml`).

## Contrato público (`src/features/platform/index.ts`)

Sin contrato de dominio; expone infraestructura compartida a través de `src/shared/`.
