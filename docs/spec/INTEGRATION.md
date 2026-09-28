# Integración — reglas INT

> **Autoridad:** cómo el código de seis personas está junto y funcionando cada día: ramas, PRs, contratos, flags, migraciones. **Lectores:** todo el equipo, cada día. **Estado:** vigente. **Actualizado:** 2026-09-28.
> Índice máquina: [rules.yaml](rules.yaml). El bucle de trabajo: [../process/WORK_LOOP.md](../process/WORK_LOOP.md).

## El punto

Seis personas integrando **a diario**: cada historia en su rama `us/<ID>`, hecha de piezas chicas y actualizada con `main` todos los días; a `main` entra la historia completa. Todo lo demás — tamaños de PR, flags, contratos — existe para que eso sea posible sin pisarse.

### INT-001 — Rama por historia, piezas de 3 días
**Regla.** Cada historia tiene su rama `us/<ID>` (por ejemplo `us/US-LAND-01`), creada desde `main`; vive lo que dure la historia y se actualiza con `main` **al menos una vez al día**. Cada pieza de trabajo es una rama que sale de `us/<ID>` (o de la pieza anterior, si se apilan) y vuelve a ella en **3 días como máximo**. Si una pieza va a durar más, estaba mal dimensionada: se parte.
**Racional.** Una rama vieja es un merge conflict incubándose y trabajo invisible para el resto del equipo. Las piezas cortas lo evitan dentro de la historia; actualizar `us/<ID>` a diario lo evita contra el resto del equipo.
**Cumplimiento.** L1 check de antigüedad de rama en CI para los PRs de pieza; el PR `us/<ID>` → `main` está exento (F4) + L5.

### INT-002 — Un PR pequeño por tarea
**Regla.** Una pieza = un PR contra `us/<ID>` (o contra la pieza anterior) = máximo 3 días. Aproximadamente 400 líneas de diff y máximo 2 features con cambios de **código**. Ediciones de solo-`SPEC.md` no cuentan para el tope de features (una sincronización de specs tras un cambio de alcance toca muchas legítimamente) — sí cuentan para el de líneas. El PR `us/<ID>` → `main` junta piezas ya revisadas y aprobadas: queda exento de este tope.
**Racional.** Un PR gigante no se revisa: se aprueba por cansancio. Dos features máximo mantiene el radio de impacto legible.
**Cumplimiento.** L1 tamaño de diff y conteo de features (F4).

### INT-003 — Contrato primero
**Regla.** Cuando una feature necesita algo de otra — API pública, evento de dominio, esquema compartido — primero se abre un PR que cambia **solo** el contrato y los specs afectados. Con ese PR abierto, ambos lados pueden implementar en paralelo **sin esperar su aprobación**. Si la revisión cambia el contrato, la implementación se ajusta antes de su propio merge. **Ninguna implementación se mergea antes que su contrato.**
**Racional.** Mata la clase más cara de conflicto: dos personas construyendo contra supuestos privados que no coinciden. Lo que lo evita es que el supuesto esté escrito y visible antes del código. Esperar la aprobación del contrato no agrega protección cuando ajustar la implementación es barato, y con código asistido por IA lo es (decisión del PO, 2026-09-16).
**Cumplimiento.** L5 review + PR template: el PR de implementación enlaza el PR de su contrato; mientras el contrato no esté mergeado, el PR de implementación apunta a la rama del contrato o declara la dependencia, y no se mergea antes.

### INT-004 — Flags con dueño y fecha de retiro
**Regla.** Todo lo incompleto se mergea **apagado** detrás de un feature flag, con dueño y fecha de retiro registrados en el `SPEC.md` de la feature. Los flags se borran al cumplirse; un flag vencido es un hallazgo de `/deriva`.
**Racional.** `n` flags vivos son `2^n` combinaciones sin probar.
**Cumplimiento.** L1 flags del spec contra fecha de retiro (F4).

### INT-005 — Condiciones de merge
**Regla.** Antes de merge: CI verde y una aprobación de alguien que **no** trabaja en esa feature. Hacia `us/<ID>` (o hacia otra pieza): **merge commit**. Hacia `main`: **squash**, una vez por historia, con la historia completa (todos sus criterios con su prueba) y `us/<ID>` al día con `main`.
**Racional.** El revisor externo a la feature es el único que nota lo que el equipo de la feature ya normalizó por costumbre. El squash dentro de una cadena de piezas apiladas reescribe commits y obliga a resolver conflictos en cada merge; el merge commit conserva los commits y la pieza siguiente no choca. A `main` llega un commit por historia (decisión del PO, 2026-09-16).
**Cumplimiento.** Hacia `main`: L1 branch protection y ruleset de GitHub (1 aprobación, solo squash). Hacia `us/**`: L1 solo impide el push forzado; el merge commit y la aprobación de cada pieza los sostiene la revisión (L5), porque exigir PR en `us/**` bloquearía también la actualización diaria con `main`. En los dos casos, la externalidad no es verificable por GitHub (no existe el concepto de "externo a la feature" en branch protection) — la sostiene el checkbox del PR template y el revisor de cumplimiento.

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

### INT-009 — Título de PR en Conventional Commits con historia y posición
**Regla.** El título de todo PR sigue [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) y se escribe **en español**: `<tipo>(<ámbito>): <descripción>`, más un sufijo que depende de la rama:

| Rama del PR | Sufijo | Ejemplo |
|---|---|---|
| Pieza de una historia (el nombre lleva el ID: `feat/us-prod-01-…`) | `(US-XXX-NN, i/N)` — posición `i` de `N` en la pila, `1 ≤ i ≤ N`, mismo ID que la rama | `feat(catalog): formulario de paquetes (US-PROD-01, 9/10)` |
| Cierre de la historia, `us/<ID>` → `main` | `(US-XXX-NN)` | `feat(catalog): paquetes de servicios (US-PROD-01)` |
| Sin historia (CI, reglas, docs de proceso) | ninguno | `fix(ci): el push a main no vuelve a medir el tamaño del PR` |

- **Tipo:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`, `style` o `revert`. Un `!` antes de los dos puntos marca un cambio incompatible.
- **Ámbito:** obligatorio, en minúsculas: la feature (`catalog`, `store`) o el área (`ci`, `reglas`, `int`).
- **Descripción:** en español, lo que cambia visto desde quien lee el historial.

**Racional.** A `main` llega un commit por historia (INT-005) y su mensaje es el título del PR: un título libre — `Us/us land 07`, `feat/US-CLI-01 Add filter by name`, o en inglés en un repo que trabaja en español — deja un historial que no se puede leer ni filtrar por historia. El sufijo con la posición hace legible una pila de piezas sin abrir cada PR.
**Cumplimiento.** L1 `scripts/rules/check-pr-title.sh`, que corre en su propio workflow (`.github/workflows/pr-title.yml`) para re-evaluar cuando alguien **edita** el título; verifica formato, sufijo e ID contra la rama. L5 el revisor verifica el idioma, que ningún check puede juzgar.

**Convención de commits (decisión de equipo, sin check).** Cada commit sigue el mismo `<tipo>(<ámbito>): <descripción>` en español; el sufijo de historia es recomendado, no obligatorio. Los merge commits que genera GitHub al mergear una pieza (INT-005) quedan exentos. No hay check: lo verifica el revisor, y la IA lo sigue porque está en [.agents/AGENTS.md](../../.agents/AGENTS.md).

## Dueños y propiedad colectiva

Cada feature tiene un **DRI** — responsable de que el spec sea verdad y de que la feature avance — pero **el código es de todos**: cualquiera puede y debe tocar cualquier feature. La propiedad exclusiva produce silos de conocimiento, reviews de sello y bus factor de uno en la feature más riesgosa. `CODEOWNERS` marca a quién se **notifica**, no quién puede editar — y lo dice en el propio archivo.

## El escape legítimo

Desviarse se puede, con registro: una excepción **arquitectónica** exige ADR; una excepción de **proceso** exige PR etiquetado `excepcion-proceso` con justificación escrita. Si no existe forma aprobada de desviarse, la gente se desvía en silencio y el proyecto pierde el registro del porqué. El camino legítimo debe ser más barato que el silencioso.
