// Estilos de El estudio (US-LAND-04), tomados del diseño "LASHARY Beauty Studio".
// Solo tokens del tema `lashary-site` (UI-002): los valores del diseño viven en tailwind.config.js.
export const landingStudioStyles = {
  // Bloque oscuro de ancho completo, como en el diseño.
  section: 'scroll-mt-site-anchor bg-site-night text-site-paper',
  inner: 'mx-auto max-w-site px-site-gutter py-site-section',

  heading: 'mb-site-heading-gap flex items-baseline gap-site-row-gap',
  title: 'm-0 whitespace-nowrap font-site-display text-site-section-title',
  rule: 'h-px flex-auto bg-site-night-rule',
  index: 'font-site-display text-site-section-index text-site-taupe',

  // El retrato a un lado y el texto al otro; en angosto, el retrato primero.
  layout: 'flex flex-wrap items-start gap-site-columns',
  portrait:
    'relative m-0 aspect-site-photo w-full max-w-site-portrait flex-none overflow-hidden bg-site-ink-soft',
  photo: 'object-cover',
  column: 'max-w-site-technique-desc flex-auto basis-site-statement',

  paragraph: 'm-0 mb-5 text-pretty text-site-body leading-site-loose text-site-paper last:mb-0',
  name: 'mb-0 mt-8 font-site-display text-site-technique italic',
  role: 'm-0 mt-1 text-site-meta text-site-taupe',

  // Trayectoria (criterio 2): años y credenciales, separados del texto por un filete.
  trajectory: 'mt-10 border-t border-site-night-rule pt-6',
  trajectoryTitle: 'm-0 font-site-sans text-site-cta font-medium',
  years: 'm-0 mt-2 text-site-body text-site-paper',
  groupTitle: 'm-0 mt-6 text-site-meta text-site-taupe',
  list: 'm-0 mt-2 list-none p-0',
  item: 'border-b border-site-night-rule py-3 text-site-body text-site-paper',
  itemMeta: 'text-site-meta text-site-taupe',
}
