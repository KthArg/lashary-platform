---
feature: landing
dri: pendiente
estado: en_progreso
actualizado: 2026-09-21
historias:
  - id: US-LAND-01
    estado: terminada
    evidencia: "PR #49 (us/US-LAND-01 a main); piezas PRs #35 a #45; PR #58 corrige la clave closing-cta del CMS; aprobacion visual del PO el 2026-09-16 sobre las capturas del artefacto capturas-landing; el modelo hero, intro y closing-cta esta en cms.config.ts de lashary-cms y las tres claves responden 200. Pruebas: landing-hero.test.tsx, landing-home.test.tsx, site-header.test.tsx, opening-frame.test.ts, cms-reader.test.ts, landing-source.test.ts, webhook.test.ts, get-landing-content.test.ts; e2e home-hero.spec.ts, home-responsive.spec.ts, home-screenshots.spec.ts"
  - id: US-LAND-02
    estado: terminada
    evidencia: "PR #63 (us/US-LAND-02 a main). Las fotos salen del CMS por la coleccion tecnicas, contrato v1.1 de docs/contracts/cms-api.md, cuya otra mitad es el PR #6 de lashary-cms (decision del PO el 2026-09-16: las imagenes van en el CMS). Criterios 1 a 5 demostrados en ui/__tests__/landing-techniques.test.tsx; el gateway, en content/application/__tests__/get-technique-media.test.ts, cms/__tests__/cms-reader.test.ts y cms/__tests__/webhook.test.ts. Verificado ademas contra el CMS local: fila publicada desde el panel, foto y ejemplo servidos por /api/content/tecnicas y renderizados en la landing tras el aviso firmado que invalida content:tecnicas"
  - id: US-LAND-03
    estado: terminada
    evidencia: "PRs #74 (contrato v1.2, coleccion galeria), #75 (lectura en content), #76 (cuadricula y filtro) y #77 (galeria ampliada y montaje), apilados hacia us/US-LAND-03; la otra mitad del contrato esta en el main de lashary-cms (3506d01). Criterios 1 y 3 en ui/__tests__/landing-gallery.test.tsx; 2 en content/cms/__tests__/gallery-source.test.ts y webhook.test.ts; 4 en content/application/__tests__/get-gallery.test.ts. Verificado ademas con un CMS simulado en next dev: 6 pares de 7 (el septimo sin consentimiento no aparece), sin scroll horizontal en 320, 375, 768, 1280, 1920 y 667x375, y la galeria ampliada cabe en 667x375"
  - id: US-LAND-04
    estado: en_progreso
    falta: "contrato v1.3 escrito (estudio, credenciales y razones); falta la lectura en content, las secciones El estudio y Por que aca en la landing, la navegacion y sus pruebas para los criterios 1 a 4"
  - id: US-LAND-05
    estado: no_iniciada
  - id: US-LAND-07
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# landing

Sitio publico: inicio, tecnicas, contacto, conoceme, galeria, fidelidad informativa. Contenido via feature content.

## Qué hace hoy

- `ui/SiteHeader.tsx`: cabecera fija de todas las páginas públicas (la monta `src/app/(site)/layout.tsx`). Marca con ancla a `#inicio`, "Reservar cita" hacia `RESERVE_ROUTE` (`/portal`) y, si hay secciones, la barra de enlaces (desde 860 px, token `site-nav`) y el botón de menú.
- `ui/SiteMenu.tsx`: menú a pantalla completa como diálogo modal. Foco en "Cerrar" al abrir, Tab atrapado, Escape cierra y devuelve el foco al botón, scroll de la página bloqueado mientras está abierto.
- `ui/sections.ts`: `landingSections` lista hoy solo Servicios (`TECHNIQUES_SECTION`, ancla `#servicios`); cada historia agrega la suya al montarla. La sección se renderiza siempre, incluso sin técnicas, para que el ancla de la navegación nunca apunte al vacío.

- `ui/LandingHome.tsx` + `src/app/(site)/page.tsx`: `/` es estática con revalidación de 600 s; lee `getLandingContent()` y `getGallery()` de `content` y `listTechniques({ activeOnly: true })` del entry point de `catalog` (ARCH-003), y compone hero, bienvenida, servicios, galería y llamada final dentro de `<main id="inicio">`.
- `ui/LandingHero.tsx`: título en dos líneas, subtítulo, "Reservar cita" (texto del CMS, destino `RESERVE_ROUTE`), enlace secundario solo con texto y destino, y la foto del CMS con `next/image`. Sin imagen, la píldora queda como relleno decorativo (`aria-hidden`).
- `ui/opening-frame.ts` + `ui/use-opening-animation.ts`: la apertura de la foto al bajar, en una pista de 300vh. Con `prefers-reduced-motion: reduce` no se registra el scroll y el CSS muestra título y foto quietos, uno debajo del otro. En pantallas de hasta 500 px de alto (token `site-short`) el bloque del título se alinea arriba para no quedar bajo la cabecera.
- `next.config.js`: imágenes remotas de Vercel Blob y, en desarrollo, del origen de `CMS_URL`. Next bloquea por SSRF imágenes de IPs privadas; solo con `next dev` y `CMS_URL` en loopback se permite (`dangerouslyAllowLocalIP`), nunca en producción.

- `ui/LandingIntro.tsx` y `ui/LandingClosingCta.tsx`: la bienvenida (frase y párrafo) y la llamada final (título con cierre en cursiva, texto y "Reservar cita" hacia `RESERVE_ROUTE`), con el contenido de `intro` y `closingCta`.
- `src/app/(site)/page.tsx`: título, descripción y Open Graph de la página desde `landingMessages.metadata`.
- `e2e/home-screenshots.spec.ts`: capturas de `/` en los 8 anchos (primera pantalla y página completa sin animación) para la aprobación visual del PO; CI las sube siempre como artefacto `capturas-landing`.

Medición PERF-004 (2026-09-16, `next build` + `next start`, Playwright con emulación de Chrome: 375 px, 4G lento a 1.6 Mbps y 150 ms, CPU x4; no es Lighthouse): LCP 1384–1408 ms en 3 corridas, elemento LCP el título del hero; JS inicial 141.7 KB comprimido (7 scripts). Dentro del presupuesto (2.5 s y 200 KB), así que no se optimizó nada (PERF-001).

### Servicios (US-LAND-02)

- `ui/LandingTechniques.tsx` (servidor): encabezado de sección con filete y numeral, y la lista de técnicas. Sin técnicas muestra su estado vacío en vez de desaparecer (UI-003).
- `ui/TechniqueList.tsx` (cliente, el único de la sección): acordeón como el diseño — una fila abierta a la vez, y volver a pulsar la abierta la cierra. `aria-expanded` + `aria-controls`, área pulsable de 44 px (UI-004) y el signo `+` gira a `×` con `motion-reduce` respetado. El panel **no se desmonta** al cerrar: se oculta con `hidden`, para que el `aria-controls` del botón resuelva siempre a un nodo real; por eso la animación de apertura vive en una clase aparte (`bodyOpen`), que corre al abrir y no al cargar la página.
- La fila cerrada muestra nombre, duración de primera vez y precio de primera vez; abierta agrega la descripción, el detalle de primera vez y —solo si la técnica se retoca— el precio y la duración de retoque (criterio 3), y el enlace "Reservar esta técnica".
- `ui/technique-view.ts`: adapta `TechniqueView` de `catalog` a lo que se pinta y formatea los colones enteros (ADR-0004) con `Intl` en `es-CR`. Se arma en el servidor para que el componente de cliente no arrastre `catalog` —ni su cliente de Supabase— al bundle.
- `ui/routes.ts`: `reserveRouteFor(id)` lleva a `RESERVE_ROUTE` con la técnica en la query (`?tecnica=`). El portal hoy ignora el parámetro; lo recogerá US-AGE-05.
- La descripción de cada técnica es texto del sitio, por familia de servicio (`techniqueDescriptions` en `ui/messages.ts`): el catálogo guarda precios y tiempos, no prosa. Una familia sin texto no rompe la fila.
- Las **fotos** vienen del CMS (`getTechniqueMedia()` de `content`, colección `tecnicas`) y se cruzan por `familia`, que es el único campo estable en los dos lados. La fila abierta muestra la foto principal en retrato junto al texto, y los ejemplos como miniaturas. Una técnica sin fila en el CMS se muestra sin fotos: el catálogo manda qué técnicas existen, el CMS solo las ilustra.
- `src/app/(site)/page.tsx` envuelve la lectura del catálogo en `try/catch`: si el catálogo se cae, la sección queda en su estado vacío y la landing sigue sirviéndose, igual que el contenido del CMS cae al respaldo.

### Galería (US-LAND-03)

- `ui/LandingGallery.tsx` (servidor): bloque oscuro con encabezado, filete y numeral. Sin pares muestra su estado vacío en vez de desaparecer (UI-003); el ancla `#galeria` existe siempre y la navegación la lista (`GALLERY_SECTION`).
- `ui/GalleryGrid.tsx` (cliente, el único de la sección): cuadrícula responsiva de pares (token `grid-cols-site-gallery`), cada par con sus dos fotos 3:4 lado a lado y las etiquetas "Antes" y "Después". Filtro por técnica con botones `aria-pressed`, solo con las familias que tienen pares y solo si hay más de una. Etiquetas cortas de cada familia en `galleryFamilyLabels` (`ui/messages.ts`).
- Galería ampliada: diálogo modal (`aria-modal`) con fondo sólido, foco atrapado que empieza en "Cerrar", Anterior y Siguiente dan la vuelta, las flechas del teclado recorren, Escape cierra y el foco vuelve al par que se estaba mirando; el scroll de la página queda bloqueado mientras está abierta. Su ancho se acota también por el alto de la pantalla (`max-w-site-lightbox`) para que quepa con el móvil en horizontal.
- Los pares llegan de `getGallery()` de `content` **ya filtrados por consentimiento**: la sección no filtra y no puede olvidarse de hacerlo.

Medición PERF-004 con la galería (2026-09-21, mismo método que la de US-LAND-01, con 6 pares de un CMS simulado y un Supabase simulado que responde 401 al instante): LCP 1436–1456 ms en 3 corridas, elemento LCP el título del hero; JS inicial 150.9 KB comprimido (9 scripts). Dentro del presupuesto. Sin el Supabase simulado el TTFB sube a 7 s en Windows porque el middleware reintenta contra un Supabase local apagado; eso es del entorno de medición, no de la página.

US-LAND-01 cerrada: el PO aprobó la parte "atractivo" del criterio 2 el 2026-09-16 sobre las capturas del artefacto `capturas-landing`. De las demás secciones del diseño están montadas Servicios y Galería; El estudio y Ubicación llegan con US-LAND-04 y -07.

## Decisiones de US-LAND-01 (PO, 2026-09-16)

- Diseño de referencia: "LASHARY Beauty Studio" (Claude Design). De ahí salen la cabecera, el hero, el bloque de bienvenida y la llamada final; las demás secciones del diseño pertenecen a US-LAND-02, -03, -04 y -07.
- Tema propio del sitio público: paleta y tipografía del diseño en tokens aparte (UI-002). El panel y el portal conservan su tema.
- "Reservar cita" apunta a una ruta interna fija en código, no editable desde el CMS. Hasta que exista US-AGE-05, el destino es la entrada al portal de la clienta.
- Orden de PRs: contrato del CMS, gateway en `content`, tokens del sitio, hero y cabecera (INT-002, INT-003).

## Criterios de US-LAND-01, en forma verificable (PO, 2026-09-16)

1. **Imagen principal, texto de bienvenida y llamado a la accion para agendar.** Prueba de componente: el hero renderiza la imagen con su `alt`, el titulo, el subtitulo y el enlace "Reservar cita" hacia la ruta interna fija.
2. **Responsivo.** Definicion del PO: "visible y atractivo desde cualquier dispositivo". Se verifica en dos partes:
   - *Visible* (prueba e2e automatica): en 320, 375, 414, 768, 1024, 1280 y 1920 px de ancho, y en movil horizontal (667 x 375), no hay scroll horizontal; titulo, subtitulo y "Reservar cita" estan visibles y no se superponen; el boton mide al menos 44 px de alto (UI-004). Con `prefers-reduced-motion: reduce`, el contenido se ve completo sin animacion.
   - *Atractivo* (aprobacion humana, no automatizable): el PO compara capturas en esos anchos contra el diseño de referencia. Las capturas y la aprobacion quedan en el PR que cierra la historia.
3. **Contenido editable desde el CMS.** Prueba del gateway con respuestas simuladas de uno-cms: el hero muestra lo publicado en `hero`, `intro` y `closingCta`; con el CMS caido, vacio o con una respuesta que no encaja con [cms-api.md](../../../docs/contracts/cms-api.md), muestra el contenido de respaldo y la pagina no falla.

## Contrato público (`index.ts`)

- `SiteHeader`, `LandingHome`, `LandingHero`, `LandingIntro`, `LandingClosingCta`, `LandingTechniques`, `LandingGallery`, `landingSections`, `TECHNIQUES_SECTION`, `GALLERY_SECTION` y el tipo `SiteSection`.
- `RESERVE_ROUTE` y `landingMessages`.
