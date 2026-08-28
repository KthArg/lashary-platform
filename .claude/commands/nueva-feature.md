---
description: Crea una feature desde la plantilla con su SPEC.md correctamente cableado
---
Sigue el protocolo de `.claude/skills/lashary-specs/SKILL.md`. Feature: $ARGUMENTS

1. Copia `src/features/_template/` si existe; si no, crea la estructura de `docs/spec/ARCHITECTURE.md` (SPEC.md, index.ts, domain/, application/, http|ui/, db/).
2. Front-matter según `docs/spec/STATE.md`: `estado: no_iniciada`, historias de esta feature (según DEPENDENCIES.md y el backlog) todas en `no_iniciada`, listas vacías de flags/deuda/defectos, `actualizado:` hoy.
3. Cuerpo honesto: "Hoy: no existe. Se detiene antes de todo."
4. Regenera STATUS.md (`scripts/status-gen.sh`) y muestra el diff.

El nombre va en inglés, derivado del dominio, nunca de un rol (ARCH-002).
