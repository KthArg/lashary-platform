---
description: Un componente o página contra el design system
---
Sigue el protocolo de `.claude/skills/lashary-interfaz/SKILL.md`. Ruta: $ARGUMENTS

Revisa: componentes desde DaisyUI/catálogo, no hand-rolled (UI-001); color/espaciado/tipografía desde tokens, cero valores arbitrarios (UI-002 — CI ya caza `[13px]`, tú caza los sutiles: estilos inline, redefiniciones locales del tema); responsive en los breakpoints acordados — si es la agenda diaria, pruébala mental en teléfono primero (UI.md); texto visible externalizado (DOM-009); estados vacío/carga/error si muestra datos (UI-003).

Cada hallazgo: regla ID + archivo:línea + el arreglo. Juicios de gusto = `[opinión]` y van a `/revisar-tema`, no al componente.
