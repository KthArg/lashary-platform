---
feature: content
dri: pendiente
estado: en_progreso
actualizado: 2026-10-13
historias:
  - id: US-BLOG-01
    estado: terminada
    evidencia: "PR de cierre us/US-BLOG-01 a main (contrato v1.6 de docs/contracts/cms-api.md). La historia la cumple el CMS (ADR-0001): la coleccion posts esta declarada en el main de lashary-cms (f3f8e26) y sus tres criterios estan demostrados alli, contra ese tipo y por la ruta publica GET /api/content/posts, en tests/integration/blog-posts.test.ts. Criterio 1: crea una publicacion con titulo, cuerpo enriquecido e imagen destacada, y sin imagen destacada no se puede publicar. Criterio 2: editar una publicacion cambia lo que se ve al volver a publicarla, y eliminar una publicacion la quita de lo publico y deja las demas. Criterio 3: una publicacion en borrador no es visible publicamente, y los cambios sin publicar de una ya publicada tampoco se ven. Los seis casos caen al mutar lo que protegen. Desplegado: GET https://lashary-cms.vercel.app/api/content/posts responde 200 desde el 2026-10-13. El PR #113, que traia un contrato anterior, se cerro sin fusionar el 2026-10-13"
  - id: US-BLOG-02
    estado: en_progreso
    falta: "todo el codigo: content no lee la coleccion posts, no existe la ruta /blog ni sus tarjetas, y no hay orden por fecha ni paginacion"
  - id: US-BLOG-03
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# content

Gateway del CMS externo (ADR-0001) y paginas publicas de blog. El gateway se construye con US-LAND-01 y US-BLOG-02 (ADR-0007).

## Qué hace hoy

Lectura del CMS para US-LAND-01 (tipos `hero`, `intro` y `closing-cta`, que en el código se llama `closingCta`; `CMS_CONTENT_KEYS` hace la traducción):

- `cms/cms-reader.ts`: `GET {CMS_URL}/api/content/:key?v=<instante>`, sin caché de fetch, timeout de 3 s. Estado no-200, cuerpo sin `data`, JSON inválido, red caída o timeout: `CmsUnavailable` como resultado, no como excepción.
- `application/get-landing-content.ts`: lee los tres tipos en paralelo (si uno falla, falla la lectura entera) y valida campo a campo contra el contrato. Requerido vacío, inválido o más largo que su máximo: respaldo de ese campo. Tipo con todos sus requeridos vacíos: respaldo del tipo. Opcional vacío: `null`. Enlaces fuera de ruta interna, ancla, `http(s)`, `mailto` y `tel`: `null`. Imagen sin `url` o sin `alt`, o con `http:` absoluto: `null`; ruta relativa se resuelve contra `CMS_URL`.
- `cms/landing-source.ts`: una entrada de `unstable_cache` con TTL de 600 s y tags `content:hero`, `content:intro`, `content:closing-cta`. Una lectura fallida lanza dentro de la función cacheada y no se guarda; afuera se sirve el respaldo. Sin `CMS_URL` se sirve el respaldo sin llamar al CMS.
- `application/fallback-messages.ts`: contenido de respaldo (textos del diseño de referencia, sin imagen).
- `application/cms-values.ts`: la lectura de los valores crudos contra las formas del contrato (texto, enlace, imagen con su `alt` y su resolución contra `CMS_URL`). Está aparte porque la usan las dos lecturas: los singletons y la colección.
- `cms/technique-media-source.ts` + `application/get-technique-media.ts`: las fotos de cada técnica (colección `tecnicas`, contrato v1.1), indexadas por `familia`. Misma caché de 600 s, con su propio tag `content:tecnicas`. Sin `CMS_URL`, con el CMS caído o con una respuesta que no encaja devuelve el mapa vacío: las técnicas se muestran sin foto y eso **no** es un error, porque el catálogo es quien manda qué técnicas existen. Una fila sin familia o sin foto principal válida se descarta, y de dos filas con la misma familia vale la primera del editor.
- `cms/gallery-source.ts` + `application/get-gallery.ts`: los pares antes y después de la galería (colección `galeria`, contrato v1.2). Misma caché de 600 s, con su tag `content:galeria`. Un par entra solo con `consentimiento === true` (un texto, un número o la ausencia no cuentan), con las dos fotos válidas y con una familia del contrato; de los que quedan, los 24 primeros del editor. Sin `CMS_URL`, con el CMS caído o con una respuesta que no encaja devuelve la lista vacía.
- `cms/studio-source.ts` + `application/get-studio.ts`: la lectura de El estudio y Por qué acá (contrato v1.3): el singleton `estudio` y las colecciones `credenciales` y `razones`, leídos en paralelo (si uno falla, falla la lectura entera). El `texto` se parte en párrafos por línea en blanco; `anosExperiencia` y `anio` fuera de rango o no enteros cuentan como ausentes (`integer` en `cms-values.ts`). Sin `nombre` ni `texto` publicados, respaldo del perfil entero, **sin nombre ni retrato**: no se inventa a la dueña. Credenciales: hasta 12 válidas, sin respaldo. Razones: hasta 6 válidas; sin ninguna, las del diseño. `cms/studio-source.ts` los sirve con una entrada de caché de 600 s y los tres tags `content:estudio`, `content:credenciales` y `content:razones`; sin `CMS_URL`, con el CMS caído o con una respuesta que no encaja, sirve el respaldo.
- `cms/loyalty-source.ts` + `application/get-loyalty.ts`: la mecánica del programa de fidelidad (contrato v1.4): el singleton `fidelidad` y la colección provisional `niveles-fidelidad`, leídos en paralelo en una entrada de caché de 600 s con sus dos tags. El `texto` se parte en párrafos (`paragraphsOf`, ahora en `cms-values.ts` porque también la usa El estudio). Niveles ordenados por `visita`, de dos con la misma visita vale el primero del editor, hasta 6. **Sin respaldo**: con el CMS caído o sin nada publicado devuelve todo vacío, porque inventar beneficios sería prometerle algo a una clienta.
- `cms/contact-source.ts` + `application/get-contact.ts`: la lectura de contacto, horario y preguntas (contrato v1.5): el singleton `contacto` y las colecciones `horarios` y `preguntas`, leídos en paralelo. WhatsApp solo con dígitos (8 a 15), y el enlace `https://wa.me/<número>?text=<mensaje codificado>` se arma aquí. Redes y enlace del mapa solo `https://`; el mapa embebido solo si empieza por `https://www.google.com/maps/embed?`. Correo mal formado, ausente. **Sin dirección ni WhatsApp no hay contacto, y el horario no tiene respaldo**: no se inventa a dónde ir. Las preguntas sí tienen respaldo (las del diseño), hasta 12; el horario, hasta 7. `cms/contact-source.ts` lo sirve con una entrada de caché de 600 s y los tags `content:contacto`, `content:horarios` y `content:preguntas`; sin `CMS_URL` o con el CMS caído, sin contacto ni horario y con las preguntas del diseño.
- `cms/cms-reader.ts` lee además colecciones (`readCollection`), que responden `{ key, items: [...] }`.

- `cms/webhook.ts` + `src/app/api/cms/webhook/route.ts`: `POST /api/cms/webhook`. Verifica `X-UnoCMS-Firma` = `HMAC-SHA256(CMS_WEBHOOK_SECRET, "<X-UnoCMS-Ts>.<cuerpo crudo>")` en tiempo constante y una ventana de 5 minutos. Del cuerpo solo usa los `tags` conocidos —los tres singletons de la landing, `content:tecnicas`, `content:galeria` los tres de El estudio (`content:estudio`, `content:credenciales`, `content:razones`) los dos de la fidelidad (`content:fidelidad`, `content:niveles-fidelidad`) y los tres de contacto (`content:contacto`, `content:horarios`, `content:preguntas`)— y expira cada uno con `revalidateTag(tag, { expire: 0 })`. Respuestas: 200 con los tags invalidados; 401 firma ausente, inválida o fuera de ventana; 400 JSON inválido; 503 sin `CMS_WEBHOOK_SECRET` (o con menos de 32 caracteres), en cuyo caso el contenido se renueva solo por TTL.

Se detiene antes de la UI: ninguna página de `landing` llama todavía a `getLandingContent`.

## Contrato con el CMS

[docs/contracts/cms-api.md](../../../docs/contracts/cms-api.md), vigente desde 2026-09-16 para transporte, invalidacion y los tipos `hero`, `intro` y `closing-cta` (clave con guion en el CMS). La v1.1 suma la coleccion `tecnicas`, que son solo las fotos de cada tecnica: el nombre, el precio y la duracion siguen saliendo del catalogo, y el cruce entre ambos lados es por `familia`. Consecuencia aceptada: dos tecnicas de la misma familia compartirian fotos; hoy el catalogo tiene una por familia. La v1.2 suma la coleccion `galeria` (US-LAND-03): pares antes y despues con la casilla `consentimiento`, y la plataforma no muestra un par sin ella. La v1.3 suma el singleton `estudio` y las colecciones `credenciales` y `razones` (US-LAND-04). La v1.4 suma el singleton `fidelidad` y la colección `niveles-fidelidad` (US-LAND-05), provisional: cuando exista el motor de US-LAND-06, los niveles se leen de ahí y la colección se retira. La v1.5 suma el singleton `contacto` y las colecciones `horarios` y `preguntas` (US-LAND-07). El CMS es uno-cms, instancia `lashary-cms`, en modo web remota. Lo que este gateway debe cumplir, segun el contrato:

- Lee solo desde el servidor, con `CMS_URL` y timeout de 3 s.
- Valida cada respuesta contra las formas del contrato; lo que no encaja se degrada a la ultima copia en cache o al contenido de respaldo en codigo.
- Recibe el aviso firmado en `POST /api/cms/webhook` e invalida por tag; TTL de respaldo de 10 minutos.

US-BLOG-01, terminada: la administradora crea, edita y elimina las publicaciones del blog en el panel de `lashary-cms`, en la coleccion `posts` (contrato v1.6, 2026-10-13). Esta feature no tiene codigo para esa historia: la cumple el CMS (ADR-0001) y la evidencia son las pruebas de `lashary-cms` citadas en el front-matter. Se detiene ahi: `content` todavia no lee `posts`; el gateway de lectura, el `slug` derivado de `titulo`, el orden por `fecha` y la paginacion los construye US-BLOG-02.

## Contrato público (`index.ts`)

- `getLandingContent(): Promise<LandingContent>` — solo servidor; nunca lanza.
- `landingCacheTags` — tags de la caché de la landing.
- `getStudio(): Promise<StudioContent>` y `studioCacheTags` — solo servidor; nunca lanza.
- `getLoyalty(): Promise<LoyaltyContent>` y `loyaltyCacheTags` — solo servidor; nunca lanza; sin respaldo.
- `getContact(): Promise<ContactContent>` y `contactCacheTags` — solo servidor; nunca lanza; contacto y horario sin respaldo.
- `getGallery(): Promise<GalleryPair[]>` y `galleryCacheTag` — solo servidor; nunca lanza. Solo entrega pares con consentimiento.
- `receiveCmsWebhook(request): Promise<Response>` — borde de `POST /api/cms/webhook`.
- Tipos: `ContactContent`, `ContactInfo`, `WhatsappLink`, `OpeningHours`, `Faq`, `LoyaltyContent`, `LoyaltyLevel`, `StudioContent`, `StudioProfile`, `Credential`, `CredentialKind`, `Reason`, `GalleryPair`, `GalleryFamily`, `LandingContent`, `HeroContent`, `IntroContent`, `ClosingCtaContent`, `CmsImage`.
