---
description: Corre verify.sh + pruebas y mapea cada criterio de aceptación a su prueba
---
Sigue el protocolo de `.claude/skills/lashary-desarrollo/SKILL.md`.

1. Corre `bash scripts/verify.sh` (autodetecta modo) y las pruebas del proyecto si existen. **Muestra la salida real, completa en sus fallos.**
2. Para la historia en curso: tabla criterio → prueba que lo demuestra (archivo y nombre del test). Criterio sin prueba = **NO cumplido**, así se reporta.
3. Si algo no puede correr, dilo y detente — jamás estimes que "habría pasado".

La salida de este comando es el requisito de la compuerta pre-PR (WORK_LOOP.md).
