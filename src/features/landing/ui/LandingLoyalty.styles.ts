// Estilos de Fidelidad (US-LAND-05). El diseño "LASHARY Beauty Studio" no trae esta sección:
// usa su mismo lenguaje (encabezado con filete y numeral, filetes entre filas) y solo tokens del
// tema `lashary-site` (UI-002).
export const landingLoyaltyStyles = {
  section: 'scroll-mt-site-anchor px-site-gutter pb-site-section',
  inner: 'mx-auto max-w-site',

  heading: 'mb-site-heading-gap flex items-baseline gap-site-row-gap',
  title: 'm-0 whitespace-nowrap font-site-display text-site-section-title',
  rule: 'h-px flex-auto bg-site-line',
  index: 'font-site-display text-site-section-index text-site-clay',

  // El texto a un lado y los niveles al otro; en angosto, uno debajo del otro.
  layout: 'flex flex-wrap items-start justify-between gap-site-columns',
  text: 'max-w-site-text flex-1 basis-site-text',
  paragraph: 'm-0 mb-4 text-site-body leading-site-loose text-site-ink-soft last:mb-0',
  note: 'mt-6 text-site-meta text-site-ink-muted',

  levels: 'flex-1 basis-site-statement',
  levelsTitle: 'm-0 mb-3 text-site-meta text-site-ink-muted',
  list: 'm-0 grid list-none grid-cols-site-milestones gap-x-site-row-gap p-0',
  level: 'border-t border-site-ink py-site-row-y',
  visit: 'm-0 font-site-display text-site-technique',
  benefit: 'm-0 mt-2 font-site-sans text-site-cta font-medium text-site-ink',
  detail: 'm-0 mt-1 text-site-meta text-site-ink-muted',

  empty: 'm-0 max-w-site-technique-desc text-site-body leading-site-loose text-site-ink-soft',
}
