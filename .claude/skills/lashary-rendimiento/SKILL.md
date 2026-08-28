---
name: lashary-rendimiento
description: Rendimiento en LASHARY, deliberadamente estrecho. Dispara ante queries a la base, endpoints de listado, migraciones que agregan tablas o FKs, y manejo de imágenes o assets. NO dispara para UI pura (lashary-interfaz) ni para pedir optimizaciones especulativas — su primer trabajo es impedirlas.
---

# lashary-rendimiento — impedir el desperdicio primero

**Este sistema sirve a UN estudio**: cientos de citas por semana, decenas de usuarios concurrentes. Antes de buscar problemas, esta skill impide soluciones sin problema (PERF-001): nada de memoizar componentes que renderizan tres veces al día, ni capas de caché, ni optimización de queries sin medición, ni desnormalización prematura, ni micro-benchmarks. **Optimización sin problema medido = costo sin beneficio.**

## Qué lee, en orden

1. `docs/spec/PERFORMANCE.md` (autoridad PERF-*) → 2. `docs/spec/rules.yaml` → 3. el código o migración objetivo

## Qué NO hace

- No propone optimizaciones sin una medición que muestre el problema (PERF-001). Si alguien la pide, el bloque de advertencia va primero.
- No repite lo que CI ya verifica (PERF-003 índices en FKs): lo señala a la regla y sigue.

## Lo que sí busca (muerde a cualquier escala)

N+1 y queries dentro de loops (PERF-005) · listados sin paginación server-side (PERF-002) · queries que devuelven columnas que nadie lee (PERF-005) · imágenes sin optimizar en la landing pública — la vitrina comercial (PERF-004) · índices ausentes en columnas realmente filtradas (PERF-003).

## Comandos

| Comando | Hace |
|---|---|
| `/revisar-consultas <feature>` | Busca N+1, resultados sin límite, índices faltantes y queries en loops; cada hallazgo con archivo y línea |
| `/presupuesto` | Verifica el sitio público contra el presupuesto vigente de PERFORMANCE.md#perf-004 (bundle, LCP) y reporta qué lo excede y por cuánto |
| `/medir` | Guía la medición ANTES de optimizar (PERF-001): qué medir (EXPLAIN ANALYZE, Lighthouse, timing del endpoint), cómo registrar el resultado en el PR, y el umbral a partir del cual optimizar deja de ser especulación |

## Protocolo

- Reglas PERF aplicables nombradas antes del análisis. Hallazgo sin regla = `[opinión]`.
- Conflicto con regla (p.ej. "agreguemos caché por si acaso") → bloque de advertencia + `/medir` como alternativa legítima.
