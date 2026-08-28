---
description: N+1, resultados sin límite, índices faltantes, queries en loops
---
Sigue el protocolo de `.claude/skills/lashary-rendimiento/SKILL.md`. Feature: $ARGUMENTS

Recorre `src/features/$ARGUMENTS/db/` y sus use cases buscando: query dentro de un loop o `.map` (PERF-005); N+1 — fetch de lista y luego fetch por elemento; listado sin paginación server-side (PERF-002); `select *` o columnas que nadie del lado receptor lee (PERF-005); filtro sobre columna sin índice en las migraciones (PERF-003).

Cada hallazgo: regla ID + archivo:línea + el arreglo (join, `in ()`, índice, paginación). Recuerda el techo de la skill: nada de proponer optimizaciones sin problema — esto busca defectos estructurales, no microsegundos.
