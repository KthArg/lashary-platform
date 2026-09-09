---
feature: content
dri: pendiente
estado: en_progreso
actualizado: 2026-09-08
historias:
  - id: US-BLOG-01
    estado: no_iniciada
  - id: US-BLOG-02
    estado: no_iniciada
  - id: US-BLOG-03
    estado: no_iniciada
flags:
  - nombre: landing_cms_content
    estado: apagado
    dueno: Bayron Alpizar
    retiro: 2026-12-01
deuda: []
defectos: []
---

# content

Gateway del CMS externo (ADR-0001) y paginas publicas de blog. El gateway se construye con US-LAND-01 y US-BLOG-02 (ADR-0007). US-BLOG-01: cubierta por el CMS existente, pendiente verificar criterios (borradores).

## Qué hace hoy

El gateway hacia el CMS nace con US-LAND-01 (historia de la feature `landing`), en su primera rebanada: la seccion de inicio.

- `domain/home-content.ts`: tipo `HomeContent` (heroImage {url, alt}, welcomeText, ctaLabel) y `parseHomeContent(raw)` — parser defensivo en el borde (DOM-007): cualquier campo faltante, vacio o de tipo inesperado descarta la respuesta entera y devuelve `null`. Prueba `__tests__/home-content.test.ts`.
- `application/ports.ts`: puerto `CmsGateway` — unico punto de acceso al CMS.
- `http/cms-gateway.ts`: `cmsGateway` implementa el puerto. Lee `CMS_API_URL` / `CMS_API_TOKEN` de entorno (solo servidor, SEC-004). Timeout de 3s; ante error de red, HTTP no-OK o JSON invalido devuelve `null` (degradacion con gracia, ADR-0001). Prueba `__tests__/cms-gateway.test.ts`.
- `index.ts` (ARCH-003): `getHomeContent()` — devuelve `HomeContent | null`. La decision de que mostrar cuando es `null` (fallback) es de quien consume, no de esta feature.

**Flag `landing_cms_content` (apagado).** No hay instancia del CMS con URL ni token, y el esquema de "Seccion inicio" esta asumido, no confirmado con el mantenedor (INT-003, `docs/contracts/cms-api.md`). Con el flag apagado, `fetchHomeContent()` devuelve `null` sin llamar al CMS. Dueño: Bayron Alpizar. Retiro: 2026-12-01 (o antes, al confirmar instancia + esquema + token y probar contra el CMS real).

Dónde se detiene: el camino de red del gateway (fetch real al CMS) no se ejercita contra un CMS real — solo con `fetch` mockeado en la prueba. El criterio 3 de US-LAND-01 ("contenido editable desde el CMS") queda `en_progreso` en `landing/SPEC.md` hasta encender el flag.

## Qué no hace todavía

- Paginas publicas de blog y listado (US-BLOG-02/03).
- Tipos de contenido de contacto, "conoceme", galeria y fidelidad (US-LAND-07/04/03/05) — cada uno suma su forma a `docs/contracts/cms-api.md` y su parser cuando llegue su historia.
- La verificacion de los criterios de borrador de US-BLOG-01 contra el CMS.

## Contrato público (`src/features/content/index.ts`)

Único punto de entrada (ARCH-003). Superficie de **solo servidor** (usa el token del CMS, SEC-004):

- `getHomeContent(): Promise<HomeContent | null>` — contenido de la seccion de inicio, o `null`.
- `parseHomeContent(raw: unknown): HomeContent | null` — el parser, expuesto para pruebas de contrato.
- Tipos `HomeContent`, `HomeHeroImage`.

Garantías y forma esperada del CMS: `docs/contracts/cms-api.md`.
