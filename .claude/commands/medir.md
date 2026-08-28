---
description: Cómo medir ANTES de optimizar (PERF-001) - la medición o no hay optimización
---
Sigue el protocolo de `.claude/skills/lashary-rendimiento/SKILL.md`. Sospecha: $ARGUMENTS

Guía la medición para la sospecha planteada:
- **Query lenta** → `explain (analyze, buffers)` sobre datos realistas (seeds de volumen: miles de citas, no diez). Mostrar el plan.
- **Página lenta** → Lighthouse móvil simulado ×3 corridas, mediana. Números, no impresiones.
- **Endpoint lento** → timing p50/p95 con carga realista (decenas de usuarios, no miles — este sistema sirve un estudio).

Regla de decisión: se optimiza solo si la medición muestra impacto real sobre el uso real (la agenda diaria en el teléfono de la dueña, la landing de una visitante). La medición se registra en el PR que optimiza (PERF-001). Sin medición → la respuesta correcta es "no se optimiza", y este comando la da sin pena.
