const box = 'mx-auto max-w-site px-site-gutter pb-site-section pt-site-hero-top'
const text = 'm-0 max-w-site-technique-desc text-site-body leading-site-loose text-site-ink-soft'

export const blogRouteStyles = {
  loadingBox: `${box} ${text}`,
  errorBox: box,
  errorTitle: 'm-0 mb-2 font-site-display text-site-technique text-site-ink',
  errorBody: `${text} mb-2`,
  retryButton:
    'inline-flex min-h-site-tap cursor-pointer items-center border-0 border-b border-site-ink bg-transparent font-site-sans text-site-cta text-site-ink outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus',
} as const
