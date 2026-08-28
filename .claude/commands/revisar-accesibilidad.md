---
description: Contraste, foco, teclado, labels, alt (UI-004)
---
Sigue el protocolo de `.claude/skills/lashary-interfaz/SKILL.md`. Ruta: $ARGUMENTS

Revisa contra UI-004: contraste AA en cada par texto/fondo (calcula el ratio con los valores del tema, no a ojo); foco visible en todo interactivo (¿alguien mató el outline?); operable por teclado — orden de tabulación, sin trampas de foco en modales; todo campo con label asociado de verdad (`htmlFor`/`aria-label`, no un placeholder haciendo de label); `alt` significativo, o vacío si decorativa; jerarquía de headings sin saltos.

Cada hallazgo: UI-004 + archivo:línea + arreglo concreto. Lo automatizable (contraste, labels, alt) tiene check de CI planificado — si encuentras un patrón repetido, propónlo como candidato a graduación.
