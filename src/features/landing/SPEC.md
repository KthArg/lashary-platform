---
feature: landing
dri: pendiente
estado: en_progreso
actualizado: 2026-09-08
historias:
  - id: US-LAND-01
    estado: en_progreso
    falta: "criterio 3 (contenido editable desde el CMS): el gateway existe y la pagina lo consume, pero esta apagado tras el flag landing_cms_content (content/SPEC.md) — no se demuestra extremo-a-extremo hasta confirmar instancia + esquema + token con el mantenedor (INT-003) y probar contra el CMS real. La imagen y el copy actuales son el respaldo provisional."
  - id: US-LAND-02
    estado: no_iniciada
  - id: US-LAND-03
    estado: no_iniciada
  - id: US-LAND-04
    estado: no_iniciada
  - id: US-LAND-05
    estado: no_iniciada
  - id: US-LAND-07
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# landing

Sitio publico: inicio, tecnicas, contacto, conoceme, galeria, fidelidad informativa. Contenido via feature content.

## Qué hace hoy

US-LAND-01 sobre la rama `feat/us-land-01-homepage-ui` (base: `feat/us-land-01-homepage`).

- `ui/SiteShell`: cascaron publico reutilizable — encabezado con la marca, `<main>` y pie. Enlace "saltar al contenido" y foco visible (UI-004). Las secciones de US-LAND-02/03/04/07 se montaran como `children` entre el mismo encabezado y pie.
- `ui/Hero`: seccion de inicio (criterio 1) — imagen principal, texto de bienvenida (`<h1>`) y CTA. El CTA de agendar va **deshabilitado** con la nota "el agendamiento en linea estara disponible pronto" porque la reserva (US-AGE-05) no existe.
- `ui/HomePage`: compone `SiteShell` + `Hero`. Entra por `index.ts` (ARCH-003).
- `src/app/page.tsx`: server component. `getHomeContent()` de `content` y, si devuelve `null`, `FALLBACK_HOME_CONTENT` (ADR-0001, degradacion con gracia). `export const revalidate = 3600` (SSG + ISR).
- `constants/landing-strings.ts` (DOM-009) y `constants/fallback-home-content.ts` (respaldo provisional). Imagen de respaldo: `public/landing/hero-fallback.svg`, motivo de marca decorativo (alt vacio, UI-004).
- Estilos solo con tokens del design system (UI-002); DaisyUI + marca (UI-001).

Pruebas: `__tests__/hero.test.tsx` (criterios 1, 2, 3, CTA deshabilitado, UI-002), `__tests__/home-page.test.tsx` (cascaron, UI-004). Responsivo (criterio 2): el test afirma que existen las clases `sm:`; verificacion visual a 375px y 1280px documentada en el PR.

Dónde se detiene: criterio 3 tras el flag (ver front-matter). `next build` falla el type-check por 2 errores PRE-EXISTENTES en `src/app/admin/page.tsx` (feature auth), ajenos a esta historia.

## Qué no hace todavía

- Secciones tecnicas / contacto / conoceme / galeria / fidelidad (US-LAND-02/07/04/03/05).
- `next/image` + `remotePatterns` para imagenes raster del CMS: se suma al encender el flag.

## Contrato público (`src/features/landing/index.ts`)

Único punto de entrada (ARCH-003):

- `HomePage({ content })` — la pagina de inicio; la compone la ruta `src/app/page.tsx`.
- `FALLBACK_HOME_CONTENT` — contenido de respaldo de la seccion de inicio.

Consume `getHomeContent` y el tipo `HomeContent` de `@/features/content`.
