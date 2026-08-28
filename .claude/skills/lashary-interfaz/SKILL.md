---
name: lashary-interfaz
description: Consistencia visual y accesibilidad en LASHARY. Dispara ante cualquier cambio a componentes, páginas, estilos, tema o texto visible al usuario. NO dispara para lógica sin UI (lashary-desarrollo) ni para rendimiento de assets (lashary-rendimiento).
---

# lashary-interfaz — consistencia, no creatividad

DaisyUI ya provee el vocabulario de componentes. El modo de falla aquí es seis devs inventando seis botones levemente distintos. **Esta skill hace cumplir el design system; no propone diseño nuevo en cada PR.** La dirección estética se decide una vez — en el tema — y de ahí en adelante se aplica.

## Qué lee, en orden

1. `docs/spec/UI.md` (autoridad UI-*) → 2. la config de tokens/tema (tailwind/DaisyUI) → 3. el componente o página objetivo → 4. `docs/spec/rules.yaml`

## Qué NO hace

- No inventa componentes que DaisyUI ya tiene (UI-001) ni valores fuera de tokens (UI-002).
- No aprueba texto inline en JSX: todo texto visible externalizado (DOM-009).
- No rediseña: si una pantalla pide dirección estética nueva, eso es una decisión de tema (ver `/revisar-tema`), no un parche local.

## Comandos

| Comando | Hace |
|---|---|
| `/revisar-ui <ruta>` | Revisa contra el design system: tokens, reuso de componentes, espaciado, responsive en los breakpoints acordados (la agenda diaria se usa en teléfono — UI.md), texto externalizado |
| `/revisar-accesibilidad <ruta>` | Contraste, foco visible, operabilidad por teclado, labels, alt significativo (UI-004) |
| `/estados <componente>` | Confirma que vacío, carga y error existen y son consistentes con el patrón del catálogo (UI-003) |
| `/revisar-tema` | Revisa la definición del tema como sistema: paleta DaisyUI coherente con la marca del estudio, contraste AA de cada par de colores del tema (UI-004), escala tipográfica y de espaciado sin valores huérfanos, y que ningún componente redefina localmente lo que el tema ya decide. Aquí — y solo aquí — se discute estética |

## Protocolo

- Reglas UI aplicables nombradas antes de revisar. Hallazgo sin regla = `[opinión]` (p.ej. juicios de gusto).
- Conflicto con regla (p.ej. "un colorcito custom aquí nomás") → bloque de advertencia; alternativa legítima: agregar el token al tema vía PR, no el valor inline.
- Candidatos deterministas (contraste, labels, valores arbitrarios) ya están o van a CI — señalar la regla, no re-verificar a mano.
