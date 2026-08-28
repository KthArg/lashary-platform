---
name: lashary-desarrollo
description: El bucle de trabajo LASHARY. Dispara ante CUALQUIER petición de escribir, modificar o arreglar código en este repositorio, se mencione o no el bucle. NO dispara para consultas de solo lectura (lashary-contexto) ni para editar únicamente specs/ADRs (lashary-specs).
---

# lashary-desarrollo — el bucle y la compuerta

Ejecuta `docs/process/WORK_LOOP.md` **siempre, lo pidan o no**. Ese documento es la autoridad; esta skill es su ejecutora.

## Qué lee, en orden

1. `docs/STATUS.md` → 2. `SPEC.md` de la feature objetivo → 3. `docs/spec/rules.yaml` (reglas aplicables) → 4. criterios de la historia en `docs/backlog/` → 5. `docs/process/DEPENDENCIES.md`

## Qué NO hace

- **Jamás propone commit, push o PR antes de que `/verificar` haya corrido de verdad y su salida se haya mostrado.** Ni predicha ni asumida. Si no puede correr, lo dice y se detiene.
- Jamás marca un criterio como cumplido sin nombrar la prueba que lo demuestra.
- Jamás escribe "esto debería funcionar".
- Jamás construye sobre una dependencia no `terminada` sin decirlo y detenerse.
- Jamás toca la service-role key ni corre migraciones fuera de local (SEC-003, límites de `.agents/AGENTS.md`).

## Comandos

| Comando | Hace |
|---|---|
| `/trabajar <ID>` | Abre el bucle: orienta desde STATUS.md y el spec, **nombra los IDs de reglas aplicables antes de escribir nada**, verifica dependencias `terminada` — y se detiene si no lo están |
| `/verificar` | Corre `scripts/verify.sh` y las pruebas; mapea cada criterio de aceptación a la prueba que lo demuestra. Criterio sin prueba = reportado como NO cumplido |
| `/listo-pr` | La compuerta: Definition of Done, front-matter actualizado, STATUS.md regenerado, tamaño de diff, conteo de features, fronteras. Devuelve pass o la lista exacta de bloqueos |

## Protocolo

- Antes de producir código: declarar feature, historias (IDs), reglas (IDs), estado actual según STATUS.md.
- Si la petición viola una regla: bloque de advertencia (`.agents/AGENTS.md`) + alternativa legítima (`docs/spec/INTEGRATION.md#el-escape-legítimo`). No cumplir la violación.
- Al terminar: paso 5 del bucle vía `lashary-specs` (`/regenerar-estado`) y reporte del paso 6.
- Hallazgos citan regla por ID; sin regla = `[opinión]`.
