# Rendimiento — reglas PERF

> **Autoridad:** qué se optimiza, qué NO se optimiza, y los presupuestos de la página pública. **Lectores:** quien toque queries, listados, migraciones con tablas/FKs, o imágenes. **Estado:** vigente. **Actualizado:** 2026-08-27.
> Índice máquina: [rules.yaml](rules.yaml).

## Primero: qué NO hacer

Este sistema sirve a **un** estudio: cientos de citas por semana, decenas de usuarios concurrentes. A esta escala, la mayor parte de la optimización es costo sin beneficio. Prohibido sin una medición que muestre un problema real:

- Memoizar componentes que se renderizan tres veces al día.
- Capas de caché.
- Optimización de queries "por si acaso".
- Desnormalización prematura.
- Micro-benchmarks.

### PERF-001 — Ninguna optimización sin medición
**Regla.** Toda optimización exige primero una medición que muestre el problema real, registrada en el PR.
**Racional.** Optimizar sin medir es costo garantizado (complejidad, bugs) con beneficio imaginario a esta escala.
**Cumplimiento.** L4 `lashary-rendimiento` + L5 review.

## Segundo: lo que sí muerde a cualquier escala

### PERF-002 — Paginación server-side en listados
**Regla.** Todo endpoint de listado pagina en el servidor con límite configurable (US-CLI-01, US-BLOG-02, US-MOR-04 lo exigen; aplica a todos).
**Racional.** Sin paginación funciona con cincuenta clientas y se cae con cinco mil; el arreglo tardío toca cada pantalla que lo consume.
**Cumplimiento.** L4 `/revisar-consultas` + L5 review.

### PERF-003 — FKs indexadas
**Regla.** Toda foreign key y toda columna realmente usada en filtros lleva índice, en la misma migración que la crea.
**Racional.** La FK sin índice es la degradación silenciosa más común de PostgreSQL: invisible hoy, lineal con los datos reales.
**Cumplimiento.** L1 lint de migraciones (F4).

### PERF-004 — Presupuesto de la página pública
**Regla.** Las páginas públicas (landing, blog, galería) respetan el presupuesto acordado — propuesta inicial: **LCP ≤ 2.5s en móvil simulado, JS inicial ≤ 200 KB comprimido**; el PO puede ajustarlo, y el valor vigente vive aquí. Imágenes de galería y landing optimizadas (formato moderno, tamaños responsivos, lazy).
**Racional.** La landing es la vitrina de un negocio local; su tiempo de carga tiene consecuencia comercial directa.
**Cumplimiento.** L1 check de presupuesto en CI (F4) — `/presupuesto` lo consulta.

### PERF-005 — Sin queries en loops
**Regla.** Ninguna query dentro de un loop. Los patrones N+1 se resuelven con joins, `in ()` o batching. Las queries piden solo las columnas que alguien lee.
**Racional.** El N+1 es invisible en desarrollo con 10 filas y lineal con las 5.000 reales.
**Cumplimiento.** L4 `/revisar-consultas` (reporta archivo y línea) + L5 review.
