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

Lectura del CMS para US-LAND-01 (tipos `hero`, `intro`, `closingCta`):

- `cms/cms-reader.ts`: `GET {CMS_URL}/api/content/:key?v=<instante>`, sin caché de fetch, timeout de 3 s. Estado no-200, cuerpo sin `data`, JSON inválido, red caída o timeout: `CmsUnavailable` como resultado, no como excepción.
- `application/get-landing-content.ts`: lee los tres tipos en paralelo (si uno falla, falla la lectura entera) y valida campo a campo contra el contrato. Requerido vacío, inválido o más largo que su máximo: respaldo de ese campo. Tipo con todos sus requeridos vacíos: respaldo del tipo. Opcional vacío: `null`. Enlaces fuera de ruta interna, ancla, `http(s)`, `mailto` y `tel`: `null`. Imagen sin `url` o sin `alt`, o con `http:` absoluto: `null`; ruta relativa se resuelve contra `CMS_URL`.
- `cms/landing-source.ts`: una entrada de `unstable_cache` con TTL de 600 s y tags `content:hero`, `content:intro`, `content:closingCta`. Una lectura fallida lanza dentro de la función cacheada y no se guarda; afuera se sirve el respaldo. Sin `CMS_URL` se sirve el respaldo sin llamar al CMS.
- `application/fallback-messages.ts`: contenido de respaldo (textos del diseño de referencia, sin imagen).

- `cms/webhook.ts` + `src/app/api/cms/webhook/route.ts`: `POST /api/cms/webhook`. Verifica `X-UnoCMS-Firma` = `HMAC-SHA256(CMS_WEBHOOK_SECRET, "<X-UnoCMS-Ts>.<cuerpo crudo>")` en tiempo constante y una ventana de 5 minutos. Del cuerpo solo usa los `tags` de tipos vigentes y expira cada uno con `revalidateTag(tag, { expire: 0 })`. Respuestas: 200 con los tags invalidados; 401 firma ausente, inválida o fuera de ventana; 400 JSON inválido; 503 sin `CMS_WEBHOOK_SECRET` (o con menos de 32 caracteres), en cuyo caso el contenido se renueva solo por TTL.

Se detiene antes de la UI: ninguna página de `landing` llama todavía a `getLandingContent`.

## Contrato con el CMS

[docs/contracts/cms-api.md](../../../docs/contracts/cms-api.md), vigente desde 2026-09-16 para transporte, invalidacion y los tipos `hero`, `intro` y `closingCta`. El CMS es uno-cms, instancia `lashary-cms`, en modo web remota. Lo que este gateway debe cumplir, segun el contrato:

- Lee solo desde el servidor, con `CMS_URL` y timeout de 3 s.
- Valida cada respuesta contra las formas del contrato; lo que no encaja se degrada a la ultima copia en cache o al contenido de respaldo en codigo.
- Recibe el aviso firmado en `POST /api/cms/webhook` e invalida por tag; TTL de respaldo de 10 minutos.

US-BLOG-01: los borradores separados de lo publicado estan verificados en uno-cms (columnas `draft` y `published`; la ruta publica lee `published`). El tipo `posts` sigue en borrador en el contrato.

## Contrato público (`index.ts`)

- `getLandingContent(): Promise<LandingContent>` — solo servidor; nunca lanza.
- `landingCacheTags` — tags de la caché de la landing.
- `receiveCmsWebhook(request): Promise<Response>` — borde de `POST /api/cms/webhook`.
- Tipos: `LandingContent`, `HeroContent`, `IntroContent`, `ClosingCtaContent`, `CmsImage`.
