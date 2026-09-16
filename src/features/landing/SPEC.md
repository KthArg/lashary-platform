---
feature: landing
dri: pendiente
estado: en_progreso
actualizado: 2026-09-16
historias:
  - id: US-LAND-01
    estado: terminada
    evidencia: "PR #49 (us/US-LAND-01 a main); piezas PRs #35 a #45; PR #58 corrige la clave closing-cta del CMS; aprobacion visual del PO el 2026-09-16 sobre las capturas del artefacto capturas-landing; el modelo hero, intro y closing-cta esta en cms.config.ts de lashary-cms y las tres claves responden 200. Pruebas: landing-hero.test.tsx, landing-home.test.tsx, site-header.test.tsx, opening-frame.test.ts, cms-reader.test.ts, landing-source.test.ts, webhook.test.ts, get-landing-content.test.ts; e2e home-hero.spec.ts, home-responsive.spec.ts, home-screenshots.spec.ts"
  - id: US-LAND-02
    estado: en_progreso
    falta: "criterio 1 a medias: la fila muestra descripcion, pero no imagen ni ejemplos de resultados. Ni el catalogo (catalog_techniques) ni el contrato del CMS (docs/contracts/cms-api.md) tienen hoy de donde sacar esas imagenes; elegir la fuente es decision del PO y cambia un contrato, asi que no se invento un campo. El resto de criterios (2, 3, 4 y 5) queda demostrado en ui/__tests__/landing-techniques.test.tsx"
  - id: US-LAND-03
    estado: no_iniciada
  - id: US-LAND-04
    estado: no_iniciada
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

- `ui/LandingHome.tsx` + `src/app/(site)/page.tsx`: `/` es estática con revalidación de 600 s; lee `getLandingContent()` de `content` y `listTechniques({ activeOnly: true })` del entry point de `catalog` (ARCH-003), y compone hero, bienvenida, servicios y llamada final dentro de `<main id="inicio">`.
- `ui/LandingHero.tsx`: título en dos líneas, subtítulo, "Reservar cita" (texto del CMS, destino `RESERVE_ROUTE`), enlace secundario solo con texto y destino, y la foto del CMS con `next/image`. Sin imagen, la píldora queda como relleno decorativo (`aria-hidden`).
- `ui/opening-frame.ts` + `ui/use-opening-animation.ts`: la apertura de la foto al bajar, en una pista de 300vh. Con `prefers-reduced-motion: reduce` no se registra el scroll y el CSS muestra título y foto quietos, uno debajo del otro. En pantallas de hasta 500 px de alto (token `site-short`) el bloque del título se alinea arriba para no quedar bajo la cabecera.
- `next.config.js`: imágenes remotas de Vercel Blob y, en desarrollo, del origen de `CMS_URL`. Next bloquea por SSRF imágenes de IPs privadas; solo con `next dev` y `CMS_URL` en loopback se permite (`dangerouslyAllowLocalIP`), nunca en producción.

- `ui/LandingIntro.tsx` y `ui/LandingClosingCta.tsx`: la bienvenida (frase y párrafo) y la llamada final (título con cierre en cursiva, texto y "Reservar cita" hacia `RESERVE_ROUTE`), con el contenido de `intro` y `closingCta`.
- `src/app/(site)/page.tsx`: título, descripción y Open Graph de la página desde `landingMessages.metadata`.
- `e2e/home-screenshots.spec.ts`: capturas de `/` en los 8 anchos (primera pantalla y página completa sin animación) para la aprobación visual del PO; CI las sube siempre como artefacto `capturas-landing`.

Medición PERF-004 (2026-09-16, `next build` + `next start`, Playwright con emulación de Chrome: 375 px, 4G lento a 1.6 Mbps y 150 ms, CPU x4; no es Lighthouse): LCP 1384–1408 ms en 3 corridas, elemento LCP el título del hero; JS inicial 141.7 KB comprimido (7 scripts). Dentro del presupuesto (2.5 s y 200 KB), así que no se optimizó nada (PERF-001).

### Servicios (US-LAND-02)

- `ui/LandingTechniques.tsx` (servidor): encabezado de sección con filete y numeral, y la lista de técnicas. Sin técnicas muestra su estado vacío en vez de desaparecer (UI-003).
- `ui/TechniqueList.tsx` (cliente, el único de la sección): acordeón como el diseño — una fila abierta a la vez, y volver a pulsar la abierta la cierra. `aria-expanded` + `aria-controls`, área pulsable de 44 px (UI-004) y el signo `+` gira a `×` con `motion-reduce` respetado.
- La fila cerrada muestra nombre, duración de primera vez y precio de primera vez; abierta agrega la descripción, el detalle de primera vez y —solo si la técnica se retoca— el precio y la duración de retoque (criterio 3), y el enlace "Reservar esta técnica".
- `ui/technique-view.ts`: adapta `TechniqueView` de `catalog` a lo que se pinta y formatea los colones enteros (ADR-0004) con `Intl` en `es-CR`. Se arma en el servidor para que el componente de cliente no arrastre `catalog` —ni su cliente de Supabase— al bundle.
- `ui/routes.ts`: `reserveRouteFor(id)` lleva a `RESERVE_ROUTE` con la técnica en la query (`?tecnica=`). El portal hoy ignora el parámetro; lo recogerá US-AGE-05.
- La descripción de cada técnica es texto del sitio, por familia de servicio (`techniqueDescriptions` en `ui/messages.ts`): el catálogo guarda precios y tiempos, no prosa. Una familia sin texto no rompe la fila.
- `src/app/(site)/page.tsx` envuelve la lectura del catálogo en `try/catch`: si el catálogo se cae, la sección queda en su estado vacío y la landing sigue sirviéndose, igual que el contenido del CMS cae al respaldo.

US-LAND-01 cerrada: el PO aprobó la parte "atractivo" del criterio 2 el 2026-09-16 sobre las capturas del artefacto `capturas-landing`. De las demás secciones del diseño solo está montada Servicios; El estudio, Galería y Ubicación llegan con US-LAND-04, -03 y -07.

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

- `SiteHeader`, `LandingHome`, `LandingHero`, `LandingIntro`, `LandingClosingCta`, `landingSections` y el tipo `SiteSection`.
- `RESERVE_ROUTE` y `landingMessages`.
