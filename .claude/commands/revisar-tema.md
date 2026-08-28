---
description: El tema como sistema - paleta, contraste, escalas, sin redefiniciones locales
---
Sigue el protocolo de `.claude/skills/lashary-interfaz/SKILL.md`.

El único lugar donde se discute estética. Revisa la definición del tema (config DaisyUI/Tailwind):
1. **Paleta**: coherente con la identidad del estudio; roles semánticos completos (primary/secondary/accent/neutral/base/estados) sin colores huérfanos que nadie usa.
2. **Contraste**: cada par `X`/`X-content` del tema pasa AA (UI-004) — calcula los ratios, lista los que fallan con el valor.
3. **Escalas**: tipografía y espaciado como escala coherente; valores fuera de escala = candidatos a eliminar.
4. **Fugas**: componentes que redefinen localmente lo que el tema decide (colores en clase arbitraria, fuentes ad hoc) — cada fuga con archivo:línea (UI-002).
5. **Ambos modos**: si hay tema claro/oscuro, los dos completos — no un oscuro a medias.

Cambios de dirección estética se proponen aquí como cambio de tokens en un PR del tema — nunca como parches por componente. Preferencias sin regla = `[opinión]`, marcadas.
