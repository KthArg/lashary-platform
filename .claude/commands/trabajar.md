---
description: Abre el bucle de trabajo para una historia - orienta, nombra reglas, verifica dependencias
---
Sigue el protocolo de `.claude/skills/lashary-desarrollo/SKILL.md` y `docs/process/WORK_LOOP.md`. Historia: $ARGUMENTS

1. **Orienta**: lee STATUS.md, el SPEC.md de la feature dueña, los criterios en el backlog. Declara: feature, historia, reglas aplicables (IDs de rules.yaml), estado actual registrado.
2. **Confirma arrancable**: dependencias en DEPENDENCIES.md `terminada`; si alguna no lo está, **detente y dilo** (INT-007). Criterios verificables objetivamente; si uno no lo es, dilo antes de implementar.
3. Solo entonces: plan de incrementos pequeños respetando ARCH-003/004, y a implementar.

Recuerda la compuerta: nada de commit/push/PR sin `/verificar` corrido y mostrado.
