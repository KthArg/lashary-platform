export const siteHeaderStyles = {
  header: 'pointer-events-none fixed inset-x-0 top-0 z-site-header text-white mix-blend-difference',
  inner: 'mx-auto flex max-w-site items-center justify-between gap-5 px-site-gutter py-5',
  brand: 'pointer-events-auto block no-underline',
  brandName: 'block font-site-display text-site-logo',
  brandTagline: 'mt-1 block text-site-logo-sub',
  actions: 'pointer-events-auto flex items-center gap-4',
  desktopNav: 'hidden items-center gap-6 text-site-nav site-nav:flex',
  navLink: 'no-underline',
  reserve:
    'inline-flex min-h-11 items-center border border-white/70 px-5 text-site-nav font-medium no-underline',
  menuButton: 'flex min-h-11 cursor-pointer flex-col justify-center gap-1.5 bg-transparent py-2.5 pl-1.5',
  menuBar: 'block h-px w-6 bg-white',
}
