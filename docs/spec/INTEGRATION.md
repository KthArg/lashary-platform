# Integración — reglas INT

> **Autoridad:** cómo el código de seis personas está junto y funcionando cada día: ramas, PRs, contratos, flags, migraciones. **Lectores:** todo el equipo, cada día. **Estado:** vigente. **Actualizado:** 2026-08-27.
> Índice máquina: [rules.yaml](rules.yaml). El bucle de trabajo: [../process/WORK_LOOP.md](../process/WORK_LOOP.md).

## El punto

Seis personas integrando **a diario** contra `main`. Todo lo demás — tamaños de PR, flags, contratos — existe para que eso sea posible sin pisarse.

### INT-001 — Trunk-based, ramas de 3 días
**Regla.** Se ramifica desde `main` y se vuelve a `main`. Ninguna rama vive más de 3 días. Si va a durar más, la tarea estaba mal dimensionada: se parte, y lo que funciona se mergea detrás de un flag (INT-004).
**Racional.** Una rama vieja es un merge conflict incubándose y trabajo invisible para el resto del equipo.
**Cumplimiento.** L1 check de antigüedad de rama en CI (F4) + L5.

### INT-002 — Un PR pequeño por tarea
**Regla.** Una tarea = un PR = máximo 3 días. Aproximadamente 400 líneas de diff y máximo 2 features con cambios de **código**. Ediciones de solo-`SPEC.md` no cuentan para el tope de features (una sincronización de specs tras un cambio de alcance toca muchas legítimamente) — sí cuentan para el de líneas. Rebasar antes de merge; squash merge.
**Racional.** Un PR gigante no se revisa: se aprueba por cansancio. Dos features máximo mantiene el radio de impacto legible.
**Cumplimiento.** L1 tamaño de diff y conteo de features (F4).

### INT-003 — Contrato primero
**Regla.** Cuando una feature necesita algo de otra — API pública, evento de dominio, esquema compartido — primero se mergea un PR que cambia **solo** el contrato y los specs afectados. Ambos lados implementan después, en paralelo.
**Racional.** Mata la clase más cara de conflicto: dos personas construyendo dos semanas contra supuestos privados que no coinciden.
**Cumplimiento.** L5 review + PR template.

### INT-004 — Flags con dueño y fecha de retiro
**Regla.** Todo lo incompleto se mergea **apagado** detrás de un feature flag, con dueño y fecha de retiro registrados en el `SPEC.md` de la feature. Los flags se borran al cumplirse; un flag vencido es un hallazgo de `/deriva`.
**Racional.** `n` flags vivos son `2^n` combinaciones sin probar.
**Cumplimiento.** L1 flags del spec contra fecha de retiro (F4).

### INT-005 — Condiciones de merge
**Regla.** Antes de merge: rebase sobre `main`, CI verde, dos aprobaciones — al menos una de alguien que **no** trabaja en esa feature. Squash merge.
**Racional.** El revisor externo a la feature es el único que nota lo que el equipo de la feature ya normalizó por costumbre.
**Cumplimiento.** L1 branch protection en GitHub (F4).

### INT-006 — El linter es la autoridad de estilo
**Regla.** El estilo no se discute en review, nunca. Si el linter debió atrapar algo, el fix es un PR a la config del linter, no un comentario a una persona.
**Racional.** Cada discusión de estilo en review es tiempo robado a la discusión de correctitud, y además es repetible: el linter no.
**Cumplimiento.** L1 lint en CI.

### INT-007 — Planificación consciente de dependencias
**Regla.** Una historia cuyas dependencias no están `terminada` no puede comprometerse a un sprint. El grafo vive en [../process/DEPENDENCIES.md](../process/DEPENDENCIES.md) y se consulta en cada planificación (`/empezables`).
**Racional.** Comprometer sobre cimientos ausentes convierte el sprint en una fila de gente bloqueada esperándose entre sí.
**Cumplimiento.** L5 planificación + skill `lashary-contexto`.

### INT-008 — Migraciones versionadas forward-only
**Regla.** Migraciones versionadas en `supabase/migrations/`, solo hacia adelante, **máximo una por PR**, patrón expand/contract para cualquier cambio destructivo (renombrar/borrar columna = expandir, migrar datos, contraer en PR posterior).
**Racional.** Una migración destructiva de un solo paso deja base y código desincronizados durante el deploy — con seis personas mergeando a diario, eso es una interrupción garantizada.
**Cumplimiento.** L1 conteo y lint de migraciones en CI (F4).

## Dueños y propiedad colectiva

Cada feature tiene un **DRI** — responsable de que el spec sea verdad y de que la feature avance — pero **el código es de todos**: cualquiera puede y debe tocar cualquier feature. La propiedad exclusiva produce silos de conocimiento, reviews de sello y bus factor de uno en la feature más riesgosa. `CODEOWNERS` marca a quién se **notifica**, no quién puede editar — y lo dice en el propio archivo.

## El escape legítimo

Desviarse se puede, con registro: una excepción **arquitectónica** exige ADR; una excepción de **proceso** exige PR etiquetado `excepcion-proceso` con justificación escrita. Si no existe forma aprobada de desviarse, la gente se desvía en silencio y el proyecto pierde el registro del porqué. El camino legítimo debe ser más barato que el silencioso.
