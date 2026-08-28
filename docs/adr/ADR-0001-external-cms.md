# ADR-0001 — CMS propio existente, en repositorio aparte, integrado por API

> **Estado:** aceptado. **Fecha:** 2026-08-27. **Decisores:** PO (Kenneth) + bootstrap.

## Contexto

El backlog exige contenido editable (landing, galería, blog: US-LAND-01…07, US-BLOG-01…03). Construir un CMS a medida está explícitamente fuera de alcance. ARCH-001 manda un solo repositorio, con una excepción legítima: un producto de terceros con ciclo de deploy propio. Existe un CMS ya construido por un miembro del equipo (Next.js, repo aparte, API) que hoy cubre textos de landing, galería y blog.

## Decisión

Usar el CMS existente como producto externo: repo y deploy separados, consumido **exclusivamente** por API a través de la feature `content` (gateway único). El contrato vive en [../contracts/cms-api.md](../contracts/cms-api.md) y cambia con la disciplina de INT-003 (contrato primero). Es la **única** excepción a ARCH-001.

## Alternativas consideradas

- **Payload CMS embebido en la app** (mismo repo, mismo Postgres): mejor encaje con ARCH-001, pero duplica lo que el CMS existente ya resuelve y descarta trabajo hecho y conocido por el equipo.
- **Strapi / Sanity**: herramienta madura, pero introduce un tercero nuevo, curva de aprendizaje, y (Sanity) datos de contenido fuera de nuestra infraestructura — sin ventaja sobre lo ya construido.
- **Contenido editado desde el panel admin propio**: viable, pero es construir gestión de contenido desde cero con otro nombre — exactamente lo excluido.
- **CMS a medida nuevo**: excluido por alcance; 20+ puntos no presupuestados compitiendo con el producto.

## Consecuencias

- **Ganamos:** cero costo de construcción de CMS; el equipo ya conoce la herramienta; la plataforma queda desacoplada del ciclo de vida del contenido.
- **Perdemos / aceptamos:** un segundo deploy que puede fallar por separado — la landing debe degradar con gracia (contenido cacheado o fallback estático), no caerse; CI no puede verificar automáticamente que ambos lados del contrato concuerdan (el contrato escrito + INT-003 es la mitigación, y es más débil que un monorepo); deriva de esquema posible si el CMS cambia sin avisar.
- **Riesgo señalado: bus factor 1.** El CMS lo mantiene una sola persona (Kenneth). Mitigación mínima exigida: el repo del CMS es accesible a todo el equipo y sus cambios de API pasan por el contrato. Si el mantenimiento se vuelve cuello de botella, se reevalúa este ADR.
- **Pendientes** (bloquean el paso del contrato a "vigente", no este ADR): dónde persiste datos el CMS; soporte real de borradores, consentimiento en galería y SEO; auth del API; mecanismo de invalidación.
- El precio de técnicas **nunca** vive en el CMS: viene del catálogo (US-AGE-08). Un hecho, un lugar.
