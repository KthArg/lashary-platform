# Contrato — API del CMS externo

> **Autoridad:** qué contenido necesita esta plataforma del CMS y bajo qué garantías. Es un contrato **de demanda**: nace de los criterios del backlog. La forma final (rutas, esquema JSON) se fija con el mantenedor del CMS y se versiona aquí (INT-003). **Lectores:** feature `content`; mantenedor del CMS. **Estado:** borrador — pendiente de confirmación del mantenedor. **Actualizado:** 2026-08-27.

## Hechos conocidos del CMS

Herramienta propia del equipo, hecha en Next.js, repo y deploy separados ([ADR-0001](../adr/ADR-0001-external-cms.md)). Expone API. Hoy cubre: textos de landing, galería y blog.

## Tipos de contenido requeridos (derivados del backlog)

| Contenido | Campos mínimos | Lo exige |
|---|---|---|
| Sección inicio | imagen principal, texto de bienvenida, CTA | US-LAND-01 |
| Sección contacto | horario, ubicación/zona, medios de contacto, link WhatsApp con mensaje predefinido, redes (Instagram principal) | US-LAND-07 |
| Sección "conóceme" | foto, texto, trayectoria (formación, certificaciones, años) | US-LAND-04 |
| Galería | pares antes/después, **registro de consentimiento por par** (clienta, fecha, medio) | US-LAND-03 |
| Mecánica de fidelidad (informativa) | texto administrable | US-LAND-05 |
| Publicación de blog | título, cuerpo enriquecido, imagen destacada, extracto, fecha de publicación, **estado borrador/publicado**, metadatos SEO | US-BLOG-01/02/03 |

Descripciones/imágenes de técnicas en la landing (US-LAND-02) **componen** contenido del CMS con precio y duración que vienen del catálogo de la plataforma (US-AGE-08). El precio nunca vive en el CMS: un solo lugar por hecho.

## Garantías que la plataforma necesita

1. JSON sobre HTTPS; IDs estables entre ediciones.
2. El endpoint público entrega **solo contenido publicado**; los borradores jamás salen (US-BLOG-01).
3. Listado de blog con paginación y orden por fecha descendente (US-BLOG-02).
4. URLs de imagen servibles con caché y tamaños razonables (PERF-004 mide la landing resultante).
5. Cambios de esquema son **versionados y anunciados**: un campo no desaparece sin aviso; el contrato se actualiza aquí antes del cambio (INT-003 aplica también a esta frontera).
6. Mecanismo de invalidación acordado (webhook de republicación o TTL corto) para que "los cambios se reflejan" de los criterios sea verdad.

## Pendientes de confirmación con el mantenedor

URL base y auth del API (token de solo lectura server-side; jamás en cliente — pariente de SEC-004) · dónde persiste datos el CMS · soporte actual de: borradores, campo de consentimiento en galería, SEO, extracto · webhook vs TTL · formato exacto de respuesta por tipo.

Al confirmarse, este documento pasa a **vigente** con el esquema real, y US-CMS-01 implementa el gateway en `src/features/content/` contra él.
