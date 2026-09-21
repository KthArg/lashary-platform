// Estilos de Ubicación (US-LAND-07), tomados del diseño "LASHARY Beauty Studio".
// Solo tokens del tema `lashary-site` (UI-002).
export const landingLocationStyles = {
  section: 'scroll-mt-site-anchor px-site-gutter pb-site-section',
  inner: 'mx-auto max-w-site',

  heading: 'mb-site-heading-gap flex items-baseline gap-site-row-gap',
  title: 'm-0 whitespace-nowrap font-site-display text-site-section-title',
  rule: 'h-px flex-auto bg-site-line',
  index: 'font-site-display text-site-section-index text-site-clay',

  // Los datos a un lado y el mapa al otro; en angosto, uno debajo del otro.
  layout: 'flex flex-wrap gap-site-columns',
  details: 'max-w-site-text flex-1 basis-site-text',
  address: 'm-0 mb-1 text-site-cta leading-site-loose text-site-ink',
  city: 'm-0 mb-8 text-site-meta text-site-ink-muted',

  groupTitle: 'm-0 mb-3 text-site-meta text-site-ink-muted',
  hours: 'm-0 mb-8 grid grid-cols-site-hours gap-x-7 gap-y-3 text-site-body',
  // Cada par día y horas: su contenedor no ocupa lugar en la grilla.
  hoursRow: 'contents',
  days: 'text-site-ink-muted',
  range: 'm-0 text-site-ink',
  note: 'm-0 mb-8 text-site-body text-site-ink-soft',

  actions: 'flex flex-wrap items-center gap-x-6 gap-y-3',
  whatsapp:
    'inline-flex min-h-site-tap items-center bg-site-ink px-6 font-site-sans text-site-cta font-medium text-site-paper no-underline outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus',
  social:
    'inline-flex min-h-site-tap items-center text-site-cta text-site-ink underline outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus',
  email: 'mt-4 block text-site-body text-site-ink-soft',
  newTab: 'sr-only',

  map: 'min-h-site-map flex-1 basis-site-aside border-0 bg-site-taupe',
  mapLink:
    'inline-flex min-h-site-tap items-center text-site-cta text-site-ink underline outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus',

  empty: 'm-0 max-w-site-technique-desc text-site-body leading-site-loose text-site-ink-soft',
}
