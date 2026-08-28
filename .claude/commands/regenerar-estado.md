---
description: Regenera STATUS.md y reporta qué cambió
---
Sigue el protocolo de `.claude/skills/lashary-specs/SKILL.md`.

1. Guarda el STATUS.md actual, corre `bash scripts/status-gen.sh`, muestra el diff entre ambos.
2. Si el diff revela un estado sospechoso (una `terminada` nueva sin evidencia, un bloqueo nuevo), señálalo con su regla (EST-004/005) — el arreglo va en el SPEC.md de la feature, jamás en STATUS.md a mano (EST-002).
