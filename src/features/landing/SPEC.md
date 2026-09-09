---
feature: landing
dri: pendiente
estado: en_progreso
actualizado: 2026-09-08
historias:
  - id: US-LAND-01
    estado: en_progreso
    falta: "solo existe el gateway del CMS (feature content, apagado tras el flag landing_cms_content). Falta la UI: cascaron publico (header/footer), seccion hero y el cableado de src/app/page.tsx con fallback estatico + ISR. El criterio 3 (contenido editable desde el CMS) no se demuestra hasta confirmar instancia + esquema + token con el mantenedor (INT-003) y probar contra el CMS real."
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

US-LAND-01 en progreso sobre la rama `feat/us-land-01-homepage` (base: `main`).

- La feature `content` expone `getHomeContent()` — el gateway hacia el CMS de la seccion de inicio (ver `src/features/content/SPEC.md`). Apagado tras el flag `landing_cms_content` (INT-004).
- `src/features/landing/` todavia no tiene codigo: el cascaron publico, el hero y el cableado de `src/app/page.tsx` llegan en la segunda rebanada.

## Qué no hace todavía

- La pagina de inicio en si: hoy `src/app/page.tsx` sigue siendo el placeholder del logo.
- Secciones tecnicas / contacto / conoceme / galeria / fidelidad (US-LAND-02/07/04/03/05).

## Contrato público

Sin contrato todavía. Al crearse, entra por `index.ts` (ARCH-003).
