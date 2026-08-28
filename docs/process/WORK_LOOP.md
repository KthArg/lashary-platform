# El bucle de trabajo

> **Autoridad:** cómo se hace cualquier trabajo en este repositorio, y la compuerta antes de todo PR. **Lectores:** todo el equipo y toda IA, en cada tarea — lo pidan o no. **Estado:** vigente. **Actualizado:** 2026-08-27.

Este bucle corre **siempre**, sin que nadie lo pida. No es ceremonia: cada paso existe porque su ausencia ya costó cara en algún proyecto.

## Los seis pasos

**1. Orientarse.** Leer [docs/STATUS.md](../STATUS.md), el `SPEC.md` de la feature objetivo y las reglas aplicables ([rules.yaml](../spec/rules.yaml)). Declarar en voz alta, antes de escribir nada: qué feature, qué historias (IDs), qué reglas (IDs) aplican, y qué dice STATUS.md del estado actual.

**2. Confirmar que se puede empezar.** Verificar en [DEPENDENCIES.md](DEPENDENCIES.md) que las dependencias de la historia están `terminada`. Si una no lo está, **detenerse y decirlo** — no se construye sobre cimientos ausentes. Verificar que los criterios de aceptación son objetivamente verificables; si uno no lo es, decirlo antes de implementarlo.

**3. Implementar en incrementos pequeños**, respetando la frontera de la feature (ARCH-003/004) y las reglas de dominio.

**4. Verificar.** Correr `scripts/verify.sh` (mismo que CI) y las pruebas. Mapear **cada criterio de aceptación a la prueba que lo demuestra**. Un criterio sin prueba no está cumplido, punto.

**5. Actualizar estado.** Editar el front-matter del `SPEC.md` y regenerar `STATUS.md` (`scripts/status-gen.sh`). Si algo quedó incompleto, registrar exactamente dónde se detiene. Si se tomó deuda, registrarla con su costo (EST-006).

**6. Reportar.** Qué cambió, qué reglas aplicaron, qué criterios quedaron demostrados y por cuál prueba, qué falta, qué deuda se creó.

## Camino corto

Para cambios que **no tocan código fuente** (documentación, comentarios, config sin efecto de comportamiento): pasos 1, 3, 4 y 6 — sin actualización de estado. Existe para que el bucle completo siga siendo creíble: un proceso demasiado pesado para un typo termina salteado también para el trabajo real.

## La compuerta (antes de cualquier commit / push / PR)

- **Nunca** proponer commit, push o PR sin haber corrido el paso 4 y **mostrado su salida real**. Ni predicha, ni asumida — corrida.
- Si la verificación **no se puede correr**, decirlo con claridad y detenerse. No estimar si habría pasado.
- **Nunca** marcar un criterio como cumplido sin nombrar la prueba que lo demuestra.
- **Nunca** escribir "esto debería funcionar". O se verificó, o el estado es `en_progreso` con el faltante nombrado.
- **Nunca** actualizar STATUS.md para decir que algo está terminado si las pruebas no corrieron. Es la forma más fácil de hacer que el archivo de estado mienta — y un archivo de estado que miente es peor que ninguno.
- Si una petición exige romper una regla: emitir el bloque de advertencia de [.agents/AGENTS.md](../../.agents/AGENTS.md) y proponer la alternativa legítima ([el escape formal](../spec/INTEGRATION.md#el-escape-legítimo)) en vez de cumplir.

## Checklist de PR (resumen; el template de PR lo repite)

1. Bucle corrido, salida del paso 4 en el PR.
2. `SPEC.md` de las features tocadas actualizado; `STATUS.md` regenerado (EST-002/003).
3. Diff ≤ ~400 líneas, ≤ 2 features (INT-002); rama ≤ 3 días (INT-001).
4. Migración: máximo una, forward-only (INT-008).
5. Reglas citadas por ID donde el PR las toca.
