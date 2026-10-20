const actionLink =
  'inline-flex min-h-site-tap items-center border-b border-site-ink font-site-sans text-site-cta text-site-ink outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus'

export const blogListStyles = {
  main: 'px-site-gutter pb-site-section pt-site-hero-top',
  inner: 'mx-auto max-w-site',

  heading: 'mb-2 flex items-baseline gap-site-row-gap',
  title: 'm-0 whitespace-nowrap font-site-display text-site-section-title',
  rule: 'h-px flex-auto bg-site-line',
  intro: 'm-0 mb-site-heading-gap max-w-site-text text-site-body leading-site-loose text-site-ink-soft',

  list: 'm-0 grid list-none grid-cols-site-gallery gap-x-site-columns gap-y-site-row-body p-0',
  card: 'flex flex-col gap-2',
  figure: 'relative m-0 mb-2 aspect-video overflow-hidden bg-site-taupe',
  photo: 'object-cover',
  date: 'm-0 text-site-meta text-site-ink-soft',
  cardTitle: 'm-0 font-site-display text-site-technique text-site-ink',
  cardLink:
    'text-site-ink underline-offset-4 outline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus',
  excerpt: 'm-0 text-site-body leading-site-loose text-site-ink-soft',

  notice: 'm-0 mb-2 max-w-site-technique-desc text-site-body leading-site-loose text-site-ink-soft',
  action: actionLink,

  pagination:
    'mt-site-heading-gap flex flex-wrap items-center justify-between gap-site-row-gap border-t border-site-line pt-site-row-y',
  pageLink: actionLink,
  pageStatus: 'm-0 text-site-meta text-site-ink-soft',
}
