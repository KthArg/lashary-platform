---
description: Dónde el spec miente respecto del código real
---
Sigue el protocolo de `.claude/skills/lashary-specs/SKILL.md`. Alcance: $ARGUMENTS (vacío = todas las features)

Para cada feature en alcance, compara front-matter contra realidad:
- Historia `terminada` cuya prueba nombrada en evidencia/criterios **no existe** en el código → hallazgo (EST-005).
- Flag pasado de su fecha de retiro o sin rastro en el código → hallazgo (INT-004).
- Defecto registrado cuyo archivo/función ya no existe o ya no reproduce → hallazgo (EST-006), marcar para confirmación humana.
- Historia `en_progreso` sin un solo archivo tocado en la feature → hallazgo.
- Deuda cuya duplicación/atajo ya no está en el código → candidata a cierre.

Reporta por feature con regla e ubicación. **No corrijas estados tú**: la corrección la confirma un humano y pasa por el SPEC.md + regeneración.
