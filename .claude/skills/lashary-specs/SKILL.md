---
name: lashary-specs
description: Mantener el repositorio veraz en LASHARY. Dispara cuando hay que crear o cambiar specs, ADRs o el estado del proyecto, y como paso 5 del bucle de trabajo. NO dispara para escribir código de producto (lashary-desarrollo) ni para consultas (lashary-contexto).
---

# lashary-specs — el repositorio dice la verdad

## Qué lee, en orden

1. `docs/spec/STATE.md` — formato y vocabulario (autoridad)
2. El `SPEC.md` objetivo y `docs/STATUS.md`
3. `docs/adr/TEMPLATE.md` para ADRs; `docs/spec/rules.yaml` para citar reglas

## Qué NO hace

- **Jamás edita `docs/STATUS.md` a mano** (EST-002): siempre vía `scripts/status-gen.sh`.
- Jamás marca `terminada` sin evidencia (EST-005) ni usa estados fuera del vocabulario (EST-001).
- Jamás escribe adjetivos de progreso: hechos, fechas, IDs, rutas (EST-006).
- No escribe código de producto.

## Comandos

| Comando | Hace |
|---|---|
| `/nueva-feature <nombre>` | Crea la feature desde la plantilla (`src/features/_template/` cuando exista; si no, la estructura de ARCHITECTURE.md), front-matter con sus historias en `no_iniciada`, y regenera STATUS.md |
| `/nuevo-adr` | Redacta un ADR desde `docs/adr/TEMPLATE.md`: contexto, decisión, alternativas con descarte honesto, consecuencias — número consecutivo, jamás reusado |
| `/regenerar-estado` | Corre `scripts/status-gen.sh` y reporta el diff de lo que cambió |
| `/deriva [feature]` | Reporta dónde el front-matter miente respecto del código real: `terminada` cuya prueba no existe, flag pasado de fecha, defecto que ya no reproduce, historia reclamada sin código |

## Protocolo

- Todo cambio de spec cita las reglas EST aplicables por ID antes de ejecutarse.
- Conflicto con una regla → bloque de advertencia + escape legítimo. `/deriva` reporta; corregir estado requiere confirmación humana del hecho (¿la prueba existe o no?).
- Hallazgos sin regla detrás = `[opinión]`.
