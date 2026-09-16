---
feature: landing
dri: pendiente
estado: en_progreso
actualizado: 2026-09-16
historias:
  - id: US-LAND-01
    estado: en_progreso
    falta: "existen el contrato del CMS (PR #35), Playwright (PR #36), los tokens del tema del sitio (PR #37), la lectura del CMS (PRs #39, #40), el aviso de publicacion (PR #41) y la cabecera con menu (PR #42), la animacion de apertura (PR #43) y el hero conectado al CMS con su e2e de "visible"; no existen la bienvenida ni la llamada final, y la parte "atractivo" del criterio 2 no tiene la aprobacion visual del PO, y ningun criterio tiene una prueba que renderice la pagina"
  - id: US-LAND-02
    estado: no_iniciada
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
- `ui/sections.ts`: `landingSections` está vacía; cada historia agrega su sección al montarla. Sin secciones no se muestra navegación ni menú.

- `ui/LandingHome.tsx` + `src/app/(site)/page.tsx`: `/` es estática con revalidación de 600 s; lee `getLandingContent()` de `content` y hoy renderiza solo el hero dentro de `<main id="inicio">`.
- `ui/LandingHero.tsx`: título en dos líneas, subtítulo, "Reservar cita" (texto del CMS, destino `RESERVE_ROUTE`), enlace secundario solo con texto y destino, y la foto del CMS con `next/image`. Sin imagen, la píldora queda como relleno decorativo (`aria-hidden`).
- `ui/opening-frame.ts` + `ui/use-opening-animation.ts`: la apertura de la foto al bajar, en una pista de 300vh. Con `prefers-reduced-motion: reduce` no se registra el scroll y el CSS muestra título y foto quietos, uno debajo del otro. En pantallas de hasta 500 px de alto (token `site-short`) el bloque del título se alinea arriba para no quedar bajo la cabecera.
- `next.config.js`: imágenes remotas de Vercel Blob y, en desarrollo, del origen de `CMS_URL`. Next bloquea por SSRF imágenes de IPs privadas; solo con `next dev` y `CMS_URL` en loopback se permite (`dangerouslyAllowLocalIP`), nunca en producción.

Se detiene antes de la bienvenida (`intro`) y la llamada final (`closingCta`): `content` ya los entrega, pero `LandingHome` no los renderiza.

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

- `SiteHeader`, `LandingHome`, `LandingHero`, `landingSections` y el tipo `SiteSection`.
- `RESERVE_ROUTE` y `landingMessages`.
