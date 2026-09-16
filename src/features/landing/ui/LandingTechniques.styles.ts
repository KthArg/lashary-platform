// Estilos de la sección de técnicas (US-LAND-02), tomados del diseño "LASHARY Beauty Studio".
// Solo tokens del tema `lashary-site` (UI-002): los valores del diseño viven en tailwind.config.js.
export const landingTechniquesStyles = {
  section: 'scroll-mt-site-anchor px-site-gutter pb-site-section',
  inner: 'mx-auto max-w-site',

  // Encabezado: título, filete que ocupa el resto del ancho y numeral de la sección.
  heading: 'mb-site-heading-gap flex items-baseline gap-site-row-gap',
  title: 'm-0 whitespace-nowrap font-site-display text-site-section-title',
  rule: 'h-px flex-auto bg-site-line',
  index: 'font-site-display text-site-section-index text-site-clay',

  list: 'm-0 list-none p-0',
  // El filete va arriba de cada fila; la última cierra la lista por abajo.
  row: 'border-t border-site-line last:border-b',

  trigger:
    'flex min-h-site-tap w-full cursor-pointer flex-wrap items-baseline gap-x-site-row-gap gap-y-2 py-site-row-y text-left font-site-sans text-site-ink outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus',
  name: 'flex-auto basis-60 font-site-display text-site-technique',
  meta: 'flex-none text-site-meta text-site-ink-muted',
  sign: 'ml-auto flex-none text-site-sign text-site-ink-muted transition-transform duration-300 ease-site-out motion-reduce:transition-none',
  signOpen: 'rotate-site-sign text-site-rose',

  body: 'animate-site-in-quick pb-site-row-body motion-reduce:animate-none',
  description:
    'm-0 max-w-site-technique-desc text-site-body leading-site-loose text-site-ink-soft',
  detail: 'mt-4 flex flex-wrap items-baseline gap-x-site-row-gap gap-y-2',
  detailItem: 'text-site-meta text-site-ink-muted',
  reserve:
    'inline-flex min-h-site-tap items-center border-b border-site-ink font-site-sans text-site-cta text-site-ink outline-offset-4 transition-colors duration-200 ease-site-out hover:text-site-clay hover:border-site-clay focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus motion-reduce:transition-none',

  empty: 'm-0 max-w-site-technique-desc text-site-body leading-site-loose text-site-ink-soft',
}
