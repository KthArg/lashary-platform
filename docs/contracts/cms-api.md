# Contrato — API del CMS externo

> **Autoridad:** qué contenido lee esta plataforma del CMS, con qué forma y bajo qué garantías. Se versiona aquí antes de cualquier cambio de forma, en los dos lados (INT-003). **Lectores:** feature `content`; mantenedor del CMS. **Estado:** vigente — v1: transporte, garantías, invalidación y los tipos `hero`, `intro` y `closing-cta` (US-LAND-01); v1.1 suma la colección `tecnicas`, que son **solo las fotos** de cada técnica (US-LAND-02); v1.2 suma la colección `galeria`, los pares antes y después con su casilla de consentimiento (US-LAND-03); v1.3 suma el singleton `estudio` y las colecciones `credenciales` y `razones`, para El estudio y Por qué acá (US-LAND-04); v1.4 suma el singleton `fidelidad` y la colección `niveles-fidelidad`, la mecánica informativa del programa (US-LAND-05); v1.5 suma el singleton `contacto` y las colecciones `horarios` y `preguntas`, para Ubicación, Preguntas y el pie de página (US-LAND-07). Los demás tipos siguen en borrador (§ Tipos en borrador). **Actualizado:** 2026-09-21.

## El CMS

- **Producto:** uno-cms ([KthArg/uno-cms](https://github.com/KthArg/uno-cms)), mantenido por Kenneth ([ADR-0001](../adr/ADR-0001-external-cms.md)).
- **Instancia de Lashary:** una copia propia, en repo y despliegue aparte (`lashary-cms`). uno-cms es **una instancia por sitio**: esta instancia solo alimenta a esta plataforma.
- **Modo:** web remota (ADR-701 de uno-cms). La web de uno-cms no se usa; la landing vive en esta plataforma.
- **Persistencia:** Postgres (Neon) para contenido, Vercel Blob para imágenes.
- **Modelo de contenido:** `cms.config.ts` de `lashary-cms`. Ese archivo y este documento son las dos mitades del contrato: un cambio en uno sin el otro es deriva.

## Transporte

| Ruta | Respuesta 200 | Uso |
|---|---|---|
| `GET {CMS_URL}/api/content/:key` (singleton) | `{ "key": string, "data": { …campos } }` | secciones fijas |
| `GET {CMS_URL}/api/content/:key` (colección) | `{ "key": string, "items": [ { …campos } ] }` en el orden del editor | listas |
| `GET {CMS_URL}/api/settings` | `{ "site": { "siteName" }, "seo": { "defaultTitle"?, "defaultDescription"?, "ogImageUrl"? } }` | metadatos por defecto |

- Clave no declarada en `cms.config.ts`: `404 { "error": "not_found" }`, sin cabecera de caché.
- **Sin autenticación.** Las rutas solo entregan contenido **publicado**; los borradores no salen por ninguna ruta pública.
- **Sin CORS, a propósito del CMS.** Toda lectura ocurre en el servidor de la plataforma, dentro de `src/features/content/`. Ningún componente de cliente llama al CMS.
- **Caché del CMS:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. Publicar no purga esa copia. Por eso **toda lectura de la plataforma añade `?v=<instante de la petición>`** (la ruta ignora el parámetro): la copia de la CDN del CMS nunca se usa, y la frecuencia de lectura la controla la caché de la plataforma (§ Invalidación).
- Los elementos de colección **no traen id ni fechas**: solo los campos de su esquema. No existe ruta para un elemento suelto (`/api/content/<coleccion>.<id>` responde 404).

### Configuración en la plataforma

| Variable | Alcance | Qué es |
|---|---|---|
| `CMS_URL` | solo servidor | origen de la instancia, con protocolo y sin barra final |
| `CMS_WEBHOOK_SECRET` | solo servidor | secreto HMAC del aviso; el mismo valor que `WEBHOOK_SECRET` en `lashary-cms` |

Ninguna lleva prefijo `NEXT_PUBLIC_`. Ningún valor real entra al repositorio (SEC-004).

## Formas de valor

| Tipo en `cms.config.ts` | Forma JSON | Notas para el consumidor |
|---|---|---|
| `s.text` | `string` | |
| `s.richtext` | `{ "type": "doc", "content": [nodos] }` (ProseMirror) | nodos permitidos: `paragraph`, `text`, `hardBreak`, `heading` (niveles 2–4), `bulletList`, `orderedList`, `listItem`, `blockquote`; marcas: `bold`, `italic`, `link` (`href`). Sin imágenes dentro. Se renderiza como elementos React, nunca como HTML crudo |
| `s.image` | `{ "mediaId": string, "url": string, "alt": string, "width"?: number, "height"?: number }` | `url === ""` significa **sin imagen**. En desarrollo la URL puede ser relativa (`/api/media/local/…`): se resuelve contra `CMS_URL`. En despliegue es absoluta (Vercel Blob). Formatos: jpeg, png, webp, avif |
| `s.link` | `string` | ruta interna (`/…`), ancla (`#…`), query (`?…`), `http(s):`, `mailto:` o `tel:` |
| `s.number` / `s.boolean` / `s.select` | `number` / `boolean` / `string` de las opciones | |

**Presencia (ADR-202 y ADR-404 de uno-cms):** un campo `required` o con `default` **siempre** viene (uno-cms prohíbe declarar los dos a la vez); si nunca se publicó, llega vacío (`""`, `0`, `false`, doc vacío o imagen con `url: ""`). Un opcional sin valor no viene. La lectura del CMS no falla por contenido ausente, así que **la plataforma renderiza con valores vacíos**: ver § Degradación.

## Tipos de contenido vigentes (v1)

Consumidor único: US-LAND-01. Diseño de referencia: "LASHARY Beauty Studio" (2026-09-16).

### `hero` — singleton

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `titleLead` | text | sí | 60 | primera línea del título ("extensiones de pestañas") |
| `titleEmphasis` | text | sí | 40 | segunda línea, en cursiva ("una por una.") |
| `subtitle` | text multilínea | no | 200 | texto de bienvenida bajo el título |
| `ctaLabel` | text | no; default `"Reservar cita"`, así que siempre viene | 30 | texto del botón de reserva |
| `secondaryLabel` | text | no | 40 | texto del enlace secundario ("Ver trabajos en Instagram") |
| `secondaryHref` | link | no | — | destino del enlace secundario |
| `image` | image | sí | — | foto principal; `alt` obligatorio al publicar |

### `intro` — singleton

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `statement` | text multilínea | sí | 160 | frase destacada |
| `body` | text multilínea | no | 400 | párrafo que la acompaña |

### `closing-cta` — singleton

La clave lleva guion: uno-cms solo admite minúsculas, dígitos y guiones en las claves (`closingCta` lo rechaza al cargar la configuración). Dentro de la plataforma el tipo puede llamarse `closingCta`; hacia el CMS, en la ruta y en los tags, es `closing-cta`.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `heading` | text | sí | 80 | título ("La agenda es de una clienta") |
| `headingEmphasis` | text | no | 30 | cierre del título, en cursiva ("a la vez") |
| `body` | text multilínea | no | 240 | texto de apoyo |
| `ctaLabel` | text | no; default `"Reservar cita"`, así que siempre viene | 30 | texto del botón de reserva |

### `tecnicas` — colección (v1.1, US-LAND-02)

**Solo las fotos.** El nombre, el precio y la duración de cada técnica salen del catálogo, no de aquí (§ Lo que no vive en el CMS): un hecho, un lugar. Esta colección existe porque el catálogo no guarda imágenes y quien las cambia es la dueña, que ya edita en el panel.

**El cruce es por `familia`**, no por nombre ni por id: es el enum `catalog_service_family` del catálogo ([catalog-api.md](catalog-api.md)), el único campo estable en los dos lados. Un nombre se reescribe en el panel y el id es un uuid que nadie va a copiar a mano.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `nombre` | text | sí | 80 | **solo para el panel**: es el `titleField`, lo que identifica la fila en la lista. La plataforma **no lo lee** — el nombre que se ve en el sitio viene del catálogo |
| `familia` | select | sí | — | la llave de cruce. Valores: `lash_classic`, `lash_volume`, `lash_extra_volume`, `brow_design`, `brow_lamination`, `henna`, `waxing`, `lips` |
| `imagen` | image | sí | — | foto principal de la técnica; `alt` obligatorio al publicar |
| `ejemplo1` | image | no | — | ejemplo de resultado |
| `ejemplo2` | image | no | — | ejemplo de resultado |
| `ejemplo3` | image | no | — | ejemplo de resultado |

Reglas de consumo, para que la landing nunca dependa de que esto esté completo:

- Una familia **sin fila** en la colección, o con la fila sin publicar, se muestra sin fotos. No es un error: el catálogo manda qué técnicas existen, el CMS solo las ilustra.
- Si hay **varias filas con la misma familia**, vale la primera en el orden del editor. El resto se ignora; duplicar una familia no rompe nada.
- Una fila cuya `familia` no es ninguna de las ocho del catálogo se ignora entera.
- `ejemplo1..3` son tres ranuras fijas porque uno-cms no tiene campo de lista de imágenes. Las que falten, faltan; no hay que llenarlas en orden.
- **Consecuencia aceptada de cruzar por familia:** dos técnicas del catálogo de la misma familia comparten fotos. Hoy el catálogo tiene una por familia y el efecto no se nota. Si algún día hay dos, o se separan en familias distintas, o esta colección pasa a cruzar por el id de la técnica — y entonces el panel deja de ser editable a mano y hay que elegir la técnica de una lista. Se decide cuando ocurra, no antes.

### `galeria` — colección (v1.2, US-LAND-03)

Los pares antes y después de la galería de la landing. Cada fila es **un par**: la misma clienta antes y después del servicio.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `titulo` | text | sí | 80 | **solo para el panel**: es el `titleField`, lo que identifica el par en la lista. La plataforma **no lo lee** |
| `familia` | select | sí | — | la técnica del par, para filtrar la galería. Los mismos valores que `tecnicas.familia`: `lash_classic`, `lash_volume`, `lash_extra_volume`, `brow_design`, `brow_lamination`, `henna`, `waxing`, `lips` |
| `antes` | image | sí | — | foto antes del servicio; `alt` obligatorio al publicar |
| `despues` | image | sí | — | foto después del servicio; `alt` obligatorio al publicar |
| `consentimiento` | boolean | no; default `false`, así que siempre viene | — | la dueña confirma que la clienta autorizó publicar estas fotos |

**El consentimiento es una casilla del CMS** (decisión del PO, 2026-09-21). En el CMS solo queda la afirmación "la clienta autorizó". La evidencia de esa autorización no entra al CMS, porque todo campo del CMS sale público por la API: quién firmó, cuándo y el documento firmado los guarda la dueña fuera del sistema.

Reglas de consumo:

- **Sin `consentimiento === true`, el par no se muestra**, aunque esté publicado. Un valor ausente, `false` o que no es booleano cuenta como sin consentimiento.
- Un par sin las dos fotos válidas (con `url` y `alt`) se ignora entero: una foto sola no es un par.
- Un par cuya `familia` no es ninguna de las ocho se ignora entero.
- El orden es el del editor. La plataforma muestra como máximo los **24 primeros** pares válidos; el resto se ignora (PERF-004).
- **Límite de la casilla:** protege lo que publica la landing, no el archivo. Una foto subida al CMS queda en Vercel Blob con una URL pública aunque el par no tenga la casilla marcada. Por eso la foto de una clienta se sube **después** de tener su autorización, no antes.

### `estudio` — singleton (v1.3, US-LAND-04)

La sección "El estudio": quién es la dueña. Es un tipo nuevo y no el `about` de ejemplo que trae `lashary-cms` (`heading`, `body`, `visible`): ese lo usan las pruebas heredadas de uno-cms, y la plataforma no lo lee.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `nombre` | text | sí | 80 | nombre de la dueña |
| `rol` | text | no; default `"Lash artist y fundadora"`, así que siempre viene | 60 | lo que se lee bajo el nombre |
| `retrato` | image | sí | — | retrato vertical (4:5 en el diseño); `alt` obligatorio al publicar |
| `texto` | text multilínea | sí | 1200 | texto descriptivo. **Una línea en blanco separa párrafos**: uno-cms no tiene lista de párrafos y el richtext pediría un renderizador que esta sección no necesita |
| `anosExperiencia` | number | no | 0–60, entero | años de experiencia en el área |

Sin `nombre` ni `texto` publicados, se usa el respaldo del tipo entero (§ Degradación). Un `anosExperiencia` fuera de 0–60 o no entero se trata como ausente.

### `credenciales` — colección (v1.3, US-LAND-04)

La trayectoria de la dueña: formación y certificaciones.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `titulo` | text | sí | 120 | el curso o la certificación |
| `tipo` | select | sí | — | `formacion` o `certificacion` |
| `entidad` | text | no | 120 | quién la dio |
| `anio` | number | no | 1970–2100, entero | año en que se obtuvo |

Una fila sin `titulo` válido o con un `tipo` que no es de los dos se ignora. Se muestran como máximo las **12 primeras** válidas, en el orden del editor.

### `razones` — colección (v1.3, US-LAND-04)

La sección "Por qué acá": qué distingue al estudio.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `titulo` | text | sí | 60 | la razón, corta |
| `texto` | text multilínea | sí | 240 | la explicación |

Una fila sin los dos campos válidos se ignora. Se muestran como máximo las **6 primeras** válidas, en el orden del editor. **Sin ninguna válida se usa el respaldo en código** (las razones del diseño de referencia): la sección no queda vacía.

### `fidelidad` — singleton (v1.4, US-LAND-05)

El texto de la sección informativa del programa de fidelidad.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `texto` | text multilínea | sí | 400 | cómo funciona el programa. Una línea en blanco separa párrafos, como en `estudio` |
| `nota` | text | no | 200 | letra chica ("los beneficios no son acumulables") |

### `niveles-fidelidad` — colección (v1.4, US-LAND-05, **provisional hasta US-LAND-06**)

Qué beneficio da cada visita. La clave lleva guion, como `closing-cta`.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `visita` | number | sí | 1–50, entero | número de visita en que se obtiene el beneficio |
| `beneficio` | text | sí | 80 | el beneficio, corto ("10 % de descuento", "servicio gratis") |
| `detalle` | text | no | 160 | aclaración del beneficio |

Reglas de consumo:

- La plataforma **ordena por `visita`**, no por el orden del editor: la mecánica se lee de la primera visita a la última.
- Un nivel sin `visita` válida o sin `beneficio` se ignora. Si dos niveles tienen la misma `visita`, vale el primero del editor. Se muestran como máximo **6**.
- Sin `texto` publicado y sin niveles válidos, la sección muestra su estado vacío. **No hay respaldo en código**: inventar beneficios sería prometerle algo a una clienta.

**Por qué los niveles son provisionales (decisión del PO, 2026-09-21).** Los niveles y beneficios son reglas de negocio de la plataforma (§ Lo que no vive en el CMS), y los administrará el motor de US-LAND-06. Mientras ese motor no existe, no hay nada que contradecir, así que viven aquí para que la sección informativa los pueda mostrar. Cuando US-LAND-06 llegue, se retiran en dos pasos (expand/contract): primero la plataforma lee los niveles del motor y deja de leer esta colección; después se quita de `cms.config.ts` y de este documento. El texto de `fidelidad` se queda en el CMS.

### `contacto` — singleton (v1.5, US-LAND-07)

Dónde está el estudio y cómo contactarlo. Lo leen la sección Ubicación, el pie de página y el menú.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `direccion` | text | sí | 160 | dirección o zona de atención |
| `ciudad` | text | no | 120 | ciudad y provincia ("Ciudad Quesada, Alajuela, Costa Rica") |
| `nota` | text | no | 120 | aclaración ("Atención solo con cita reservada.") |
| `whatsapp` | text | sí | 15 | número de WhatsApp **solo con dígitos y el código de país** ("50688887777"). Otro formato se trata como ausente |
| `mensajeWhatsapp` | text multilínea | no; default `"Hola, quiero información para agendar una cita."`, así que siempre viene | 300 | mensaje inicial que abre la conversación |
| `instagram` | link | sí | — | perfil de Instagram, el canal principal. Solo `https://` |
| `facebook` | link | no | — | perfil de Facebook. Solo `https://` |
| `tiktok` | link | no | — | perfil de TikTok. Solo `https://` |
| `correo` | text | no | 120 | correo de contacto |
| `mapa` | link | no | — | URL de **inserción** de Google Maps (Compartir → Insertar un mapa → el `src` del código). Solo se acepta si empieza por `https://www.google.com/maps/embed?`; otra URL se trata como ausente |
| `mapaEnlace` | link | no | — | enlace para abrir la ubicación en Google Maps. Solo `https://` |

El botón de WhatsApp lo arma la plataforma: `https://wa.me/<whatsapp>?text=<mensajeWhatsapp codificado>`. Sin `whatsapp` válido no hay botón. Sin `direccion` ni `whatsapp` publicados no hay contacto: **no hay respaldo en código**, porque inventar una dirección o un número mandaría a una clienta a un lugar que no existe.

### `horarios` — colección (v1.5, US-LAND-07)

El horario de atención. Es una colección porque uno-cms no admite listas dentro de un singleton.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `dias` | text | sí | 40 | "Lunes a viernes", "Sábado" |
| `horas` | text | sí | 40 | "9:00 a 18:00", "Cerrado" |

Una fila sin los dos campos se ignora. Se muestran como máximo 7, en el orden del editor. Sin respaldo.

### `preguntas` — colección (v1.5, US-LAND-07)

Preguntas frecuentes, plegadas a US-LAND-07 por decisión del PO: resuelven dudas antes de contactar. Es un tipo nuevo y no el `faqs` de ejemplo de `lashary-cms`, que usa richtext y lo usan las pruebas heredadas de uno-cms.

| Campo | Tipo | Requerido (`required`) | Máx. | Qué es |
|---|---|---|---|---|
| `pregunta` | text | sí | 160 | la pregunta |
| `respuesta` | text multilínea | sí | 800 | la respuesta; una línea en blanco separa párrafos |

Una fila sin los dos campos se ignora. Se muestran como máximo 12, en el orden del editor. **Sin ninguna válida se usa el respaldo en código** (las preguntas del diseño de referencia), como `razones`.

## Lo que no vive en el CMS

| Dato | Dónde vive | Por qué |
|---|---|---|
| Destino de "Reservar cita" | código de la plataforma, ruta interna fija | es una ruta del sistema; editarla desde el panel puede romper el flujo (decisión del PO, 2026-09-16) |
| Nombre, precio y duración de técnicas | catálogo, [catalog-api.md](catalog-api.md) | un hecho, un lugar (ADR-0001). Del CMS salen **solo las fotos**, por la colección `tecnicas` |
| Evidencia del consentimiento de imágenes (quién, cuándo, documento firmado) | fuera del sistema, con la dueña | todo campo del CMS es público por la API. En el CMS solo va la casilla `galeria.consentimiento` (v1.2) |
| Niveles y beneficios de fidelidad | plataforma (US-LAND-06) | son reglas de negocio. Hasta que exista el motor, la colección provisional `niveles-fidelidad` (v1.4) los muestra |
| Navegación, logo y anclas de sección | código de la plataforma | estructura de la página, no contenido |

## Invalidación

Mecanismo: **aviso al publicar** de uno-cms (spec 16 de uno-cms), más un TTL de respaldo.

**En `lashary-cms`:** `WEBHOOK_URL={origen de la plataforma}/api/cms/webhook` y `WEBHOOK_SECRET` (≥ 32 caracteres, distinto de `APP_SECRET`).

**La plataforma recibe** `POST /api/cms/webhook`:

- Cabeceras: `X-UnoCMS-Ts` (ms desde la época) y `X-UnoCMS-Firma` (`sha256=<hex>`). `X-UnoCMS-Evento` y `X-UnoCMS-Id` **no** están firmadas y no se usan para decidir.
- Cuerpo: `{ "id", "evento", "ts", "claves": [...], "tags": ["content:<clave>" | "settings"] }`.
- Obligaciones de la plataforma:
  1. Verificar `HMAC-SHA256(CMS_WEBHOOK_SECRET, "<ts>.<cuerpo crudo>")` **sobre el cuerpo crudo**, en tiempo constante.
  2. Rechazar con 401 un `ts` fuera de una ventana de 5 minutos.
  3. Tolerar duplicados: invalidar un tag dos veces no tiene efecto adicional, así que no se exige guardar los `id` procesados.
  4. Por cada entrada de `tags` que corresponda a un tipo vigente de este contrato, expirar de inmediato la caché de la plataforma con ese tag. Los tags desconocidos se ignoran.
  5. Ignorar `media.uploaded` y `media.deleted` (llegan sin `tags`).
- Lo que el CMS **no** garantiza: entrega (dos intentos, sin cola), orden, ni unicidad.

**Caché de la plataforma:** una entrada con los tipos vigentes, etiquetada `content:<clave>` por cada uno (los mismos tags del aviso). **TTL de respaldo:** expira a los **10 minutos** aunque no llegue aviso; cota el peor caso de un aviso perdido. Una lectura fallida no se guarda en caché.

## Degradación

ADR-0001 exige que la landing no caiga si el CMS falla.

- Timeout de lectura: **3 s** por petición.
- CMS caído, timeout, respuesta no-200 o JSON que no encaja con este contrato: se sirve la última copia en caché. Sin copia, se sirve el **contenido de respaldo en código** de `content` (textos del diseño de referencia, sin imagen).
- Un campo requerido vacío se trata igual que ausente: se usa el respaldo de ese campo. Una imagen con `url: ""` no se renderiza.
- El fallo se registra en el servidor; el visitante no ve un error.

## Garantías

1. Solo contenido publicado sale del CMS (verificado en uno-cms: columnas `draft` y `published` separadas; la ruta pública lee `published`).
2. Un campo no cambia de tipo ni desaparece sin actualizar antes este documento; un campo nuevo opcional puede agregarse en `lashary-cms` y se documenta aquí en el mismo movimiento.
3. Toda respuesta se valida en `content` contra estas formas antes de llegar a `landing`; lo que no encaja se degrada (§ Degradación), no se propaga.
4. Imágenes: URLs de Vercel Blob servibles con caché; tamaños y formatos responsivos los resuelve la plataforma (PERF-004).
5. Vista previa en vivo desde el panel: **fuera de v1** (`PREVIEW_ORIGINS` sin definir en `lashary-cms`).

## Tipos en borrador

Contrato de demanda; se fijan con la primera historia que los consume.

| Tipo propuesto | Historia | Pendiente de decidir |
|---|---|---|
| `posts` (colección) | US-BLOG-01/02/03 | sin id, sin ruta por elemento y sin tipo fecha en uno-cms: el detalle busca por un campo `slug` que el CMS no hace único, la paginación y el orden por fecha ocurren en `content`, las imágenes del cuerpo no caben en el richtext |
