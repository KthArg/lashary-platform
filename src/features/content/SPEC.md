---
feature: content
dri: pendiente
estado: en_progreso
actualizado: 2026-09-16
historias:
  - id: US-BLOG-01
    estado: no_iniciada
  - id: US-BLOG-02
    estado: no_iniciada
  - id: US-BLOG-03
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# content

Gateway del CMS externo (ADR-0001) y paginas publicas de blog. El gateway se construye con US-LAND-01 y US-BLOG-02 (ADR-0007).

## Qué hace hoy

Validación y respaldo del contenido de US-LAND-01 (tipos `hero`, `intro`, `closingCta`), sin lectura HTTP todavía:

- `application/get-landing-content.ts`: `readRawLandingContent` lee los tres tipos en paralelo a través del puerto `CmsReader` (si uno falla, falla la lectura entera). `toLandingContent` valida campo a campo contra el contrato. Requerido vacío, inválido o más largo que su máximo: respaldo de ese campo. Tipo con todos sus requeridos vacíos: respaldo del tipo. Opcional vacío: `null`. Enlaces fuera de ruta interna, ancla, `http(s)`, `mailto` y `tel`: `null`. Imagen sin `url` o sin `alt`, o con `http:` absoluto: `null`; ruta relativa se resuelve contra la base del CMS.
- `application/fallback-messages.ts`: contenido de respaldo (textos del diseño de referencia, sin imagen).
- `domain/`: formas de `LandingContent` y el error `CmsUnavailable`.

Se detiene antes del adaptador HTTP del CMS, la caché y el entry point `index.ts`: ninguna página lo usa todavía.

## Contrato con el CMS

[docs/contracts/cms-api.md](../../../docs/contracts/cms-api.md), vigente desde 2026-09-16 para transporte, invalidacion y los tipos `hero`, `intro` y `closingCta`. El CMS es uno-cms, instancia `lashary-cms`, en modo web remota. Lo que este gateway debe cumplir, segun el contrato:

- Lee solo desde el servidor, con `CMS_URL` y timeout de 3 s.
- Valida cada respuesta contra las formas del contrato; lo que no encaja se degrada a la ultima copia en cache o al contenido de respaldo en codigo.
- Recibe el aviso firmado en `POST /api/cms/webhook` e invalida por tag; TTL de respaldo de 10 minutos.

US-BLOG-01: los borradores separados de lo publicado estan verificados en uno-cms (columnas `draft` y `published`; la ruta publica lee `published`). El tipo `posts` sigue en borrador en el contrato.

## Contrato público

Sin entry point todavía. Al crearse, entra por `index.ts` (ARCH-003).
