const actionLink =
  'inline-flex min-h-site-tap items-center border-b border-site-ink font-site-sans text-site-cta text-site-ink outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus'

export const blogArticleStyles = {
  main: 'px-site-gutter pb-site-section pt-site-hero-top',
  inner: 'mx-auto max-w-site-faq',

  backTop: 'mb-site-heading-gap',
  backBottom: 'mt-site-heading-gap border-t border-site-line pt-site-row-y',
  back: actionLink,

  date: 'm-0 mb-2 text-site-meta text-site-ink-soft',
  title: 'm-0 mb-4 font-site-display text-site-section-title text-site-ink',
  excerpt: 'm-0 mb-site-heading-gap max-w-site-faq-answer text-site-faq text-site-ink-soft',
  figure: 'relative m-0 mb-site-heading-gap aspect-video overflow-hidden bg-site-taupe',
  photo: 'object-cover',

  notice: 'm-0 mb-2 max-w-site-technique-desc text-site-body leading-site-loose text-site-ink-soft',
  noticeTitle: 'm-0 mb-2 font-site-display text-site-technique text-site-ink',
  actions: 'flex flex-wrap gap-site-row-gap',
  action: actionLink,
}
