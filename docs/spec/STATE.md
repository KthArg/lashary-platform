# Estado del proyecto — reglas EST y formato de SPEC.md

> **Autoridad:** cómo se registra el estado del proyecto: vocabulario, front-matter de specs, generación de STATUS.md. **Lectores:** todo el equipo al actualizar estado; `status-gen.sh`; skills. **Estado:** vigente. **Actualizado:** 2026-08-27.
> Índice máquina: [rules.yaml](rules.yaml).

## El problema que esto resuelve

Saber dónde está el proyecto no puede requerir leer Jira, escanear issues cerrados y preguntarle al último que tocó el código. Ese conocimiento no sobrevive unas vacaciones ni a un integrante nuevo. Vive en el repositorio, en una forma que no requiere interpretación.

## Front-matter de `src/features/<nombre>/SPEC.md`

```yaml
---
feature: scheduling
dri: <nombre>
estado: no_iniciada | en_progreso | bloqueada | en_revision | terminada
actualizado: AAAA-MM-DD
historias:
  - id: US-AGE-05
    estado: terminada
    evidencia: "PR #142"
  - id: US-AGE-09
    estado: en_progreso
    falta: "la prueba de concurrencia de N reservas simultaneas no existe"
  - id: US-AGE-10
    estado: bloqueada
    bloqueada_por: US-AUTH-02
flags:
  - nombre: reagendado_v2
    estado: apagado
    dueno: <nombre>
    retiro: AAAA-MM-DD
deuda:
  - que: "la validacion de horario laboral esta duplicada en http/ y en domain/"
    aceptada_en: "PR #138"
    costo: "un cambio de regla hay que hacerlo en dos lugares"
defectos:
  - que: "cancelar una cita de un dia pasado devuelve 500"
    donde: "src/features/scheduling/http/cancel.ts"
    issue: LAS-91
---
```

El cuerpo describe en prosa: qué hace la feature **hoy**, qué no hace todavía y **exactamente dónde se detiene**, y las decisiones tomadas (con enlace a ADRs si aplica).

## `docs/STATUS.md` — el agregado

Punto de entrada único para "¿dónde está el proyecto?". Lo genera `scripts/status-gen.sh` desde todos los front-matter más el backlog en `docs/backlog/`. Contiene: por feature, su estado y sus historias con estados; todo bloqueo con su bloqueador; todo defecto; toda deuda con su PR; todo flag vivo con dueño y fecha; y las historias del backlog que ninguna feature reclama.

## Reglas

### EST-001 — Vocabulario cerrado de estados
**Regla.** Estados válidos: `no_iniciada`, `en_progreso`, `bloqueada`, `en_revision`, `terminada`. Nada más. Sin porcentajes, sin "casi listo", sin "avanzado", sin "en buen estado".
**Racional.** Un lector jamás debe calibrar el optimismo de quien escribió el estado.
**Cumplimiento.** L1 validación del front-matter en CI (F4).

### EST-002 — STATUS.md es generado
**Regla.** `docs/STATUS.md` nunca se edita a mano. CI regenera y compara: si el commiteado difiere, el build falla — mismo principio que un lockfile.
**Racional.** Un archivo de estado mantenido a mano es peor que ninguno: miente con confianza.
**Cumplimiento.** L1 comparación en CI (F4).

### EST-003 — Código cambia, spec cambia
**Regla.** Si un PR toca `src/features/<x>/` (fuera del propio SPEC.md), debe tocar también el front-matter de `src/features/<x>/SPEC.md` — al menos `actualizado:`.
**Racional.** Un spec que no siguió al código es documentación que miente con fecha.
**Cumplimiento.** L1 comparación de rutas del diff (F4).

### EST-004 — Todo bloqueo nombra a su bloqueador
**Regla.** Toda historia `bloqueada` lleva `bloqueada_por:` con un ID. Toda historia no-`terminada` nombra su faltante en una frase concreta: no "falta pulir", sino "la prueba de concurrencia no existe" o "el endpoint de cancelación no valida la ventana de US-AGE-06".
**Racional.** Un bloqueo sin bloqueador es una excusa; si el faltante no cabe en una frase, no se conoce el estado.
**Cumplimiento.** L1 validación de front-matter (F4) + L4/L5 para la concreción.

### EST-005 — terminada exige evidencia
**Regla.** Una historia pasa a `terminada` solo con `evidencia:` apuntando al PR que la cerró.
**Racional.** "Creo que funciona" no es un estado verificable; un PR sí.
**Cumplimiento.** L1 validación de front-matter (F4).

### EST-006 — Hechos, no adjetivos
**Regla.** En specs y estado: hechos, fechas, IDs y rutas. Todo defecto nombra archivo o función (`donde:`). Toda deuda nombra qué se aceptó, en qué PR y qué cuesta. Ningún adjetivo de progreso en ninguna parte.
**Racional.** Un defecto sin ubicación es un rumor; una deuda sin decisión registrada es indistinguible de un error; "casi listo" significa seis cosas para seis personas.
**Cumplimiento.** L4 skills + L5 review.
