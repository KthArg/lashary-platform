// Solo tokens del design system — sin valores arbitrarios (UI-002).
export const siteShellStyles = {
  root: 'flex min-h-screen flex-col bg-brand-cream text-brand-dark',
  skipLink:
    'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-brand-dark focus:px-4 focus:py-2 focus:text-white',
  header:
    'flex shrink-0 items-center justify-center border-b border-brand-border px-6 py-5 sm:justify-start sm:px-10',
  brand: 'flex flex-col items-center gap-1 sm:items-start',
  brandName: 'font-serif text-lg uppercase tracking-widest-plus text-brand-gold',
  brandTagline: 'text-3xs uppercase tracking-super-wide text-brand-gold-light',
  main: 'flex flex-1 flex-col',
  footer:
    'shrink-0 border-t border-brand-border px-6 py-6 text-center text-2xs uppercase tracking-widest text-brand-muted sm:px-10',
}
