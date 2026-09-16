// `motion-reduce:` deshace la apertura: sin pista de scroll ni capas superpuestas, el título y la
// foto quedan quietos, uno debajo del otro.
export const landingHeroStyles = {
  section: 'relative',
  track: 'relative h-site-opening motion-reduce:h-auto',
  stage:
    'sticky top-0 h-site-screen overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:overflow-visible',
  type:
    'absolute inset-0 z-10 flex flex-col items-center justify-center gap-site-hero-gap px-site-gutter pb-site-hero-bottom pt-site-hero-top text-center site-short:justify-start site-short:pb-6 motion-reduce:relative motion-reduce:pb-site-section',
  title: 'm-0 font-normal motion-safe:animate-site-in',
  titleLead: 'block font-site-sans font-semibold text-site-hero-lead',
  titleEmphasis: 'mt-site-emphasis-gap block font-site-display italic text-site-hero-emphasis',
  body: 'flex flex-col items-center gap-site-hero-cta-gap motion-safe:animate-site-in-late',
  subtitle: 'm-0 max-w-site-subtitle text-site-body text-site-ink-soft',
  actions: 'flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5',
  primaryCta:
    'inline-flex min-h-14 items-center bg-site-ink px-8 text-site-cta font-medium text-site-paper no-underline',
  secondaryCta: 'inline-flex min-h-11 items-center text-site-cta text-site-ink-soft underline',
  photo:
    'absolute left-1/2 top-1/2 z-20 h-site-pill w-site-pill -translate-x-1/2 translate-y-site-pill-start overflow-hidden rounded-site-pill bg-site-taupe motion-reduce:relative motion-reduce:left-auto motion-reduce:top-auto motion-reduce:mx-site-gutter motion-reduce:aspect-video motion-reduce:h-auto motion-reduce:w-auto motion-reduce:transform-none motion-reduce:rounded-none',
  image: 'object-cover',
}
