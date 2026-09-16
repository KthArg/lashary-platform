---
feature: landing
dri: pendiente
estado: en_progreso
actualizado: 2026-09-16
historias:
  - id: US-LAND-01
    estado: en_progreso
    falta: "existen el contrato del CMS (PR #35), Playwright (PR #36), los tokens del tema del sitio (PR #37), la lectura del CMS (PRs #39, #40) y el aviso de publicacion en content; no existen la cabecera ni la UI del hero, y ningun criterio tiene una prueba que renderice la pagina"
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

Hoy: no existe. Se detiene antes de todo.

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

## Contrato público

Sin contrato todavía. Al crearse, entra por `index.ts` (ARCH-003).
