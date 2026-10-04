// Estilos de Preguntas (US-LAND-07), tomados del diseño "LASHARY Beauty Studio".
// Solo tokens del tema `lashary-site` (UI-002).
export const landingFaqStyles = {
  section: 'scroll-mt-site-anchor px-site-gutter pb-site-section',
  inner: 'mx-auto max-w-site',

  heading: 'mb-site-heading-gap flex items-baseline gap-site-row-gap',
  title: 'm-0 whitespace-nowrap font-site-display text-site-section-title',
  rule: 'h-px flex-auto bg-site-line',
  index: 'font-site-display text-site-section-index text-site-clay',

  list: 'm-0 max-w-site-faq list-none p-0',
  // El filete va arriba de cada pregunta; la última cierra la lista por abajo.
  item: 'border-t border-site-line last:border-b',
  question: 'm-0',
  trigger:
    'flex min-h-site-tap w-full cursor-pointer items-center justify-between gap-5 py-site-row-y text-left font-site-sans text-site-faq font-medium text-site-ink outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus',
  sign: 'flex-none text-site-sign text-site-ink-muted transition-transform duration-300 ease-site-out motion-reduce:transition-none',
  signOpen: 'rotate-site-sign text-site-rose',

  // El panel está siempre en el DOM: la animación corre al abrir, no al cargar la página.
  answer: 'max-w-site-faq-answer pb-6',
  answerOpen: 'animate-site-in-quick motion-reduce:animate-none',
  paragraph: 'm-0 mb-3 text-site-body leading-site-loose text-site-ink-soft last:mb-0',
}
