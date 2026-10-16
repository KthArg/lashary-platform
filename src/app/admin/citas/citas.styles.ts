export const adminCitasStyles = {
  // Cola de aprobación (/admin/citas, US-AGE-09).
  page: 'space-y-4',
  header: 'border-b border-brand-border pb-4',
  title: 'font-serif text-2xl md:text-3xl font-bold text-brand-dark',
  subtitle: 'text-sm text-brand-muted mt-1',
  // Pestañas de la sección, mismo patrón que catalog.styles.ts.
  tabs: 'mb-6 flex gap-2 border-b border-brand-border',
  tab: 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-brand-muted transition-colors hover:text-brand-gold',
  tabActive: 'px-4 py-2 text-sm font-semibold border-b-2 border-brand-gold text-brand-gold',
  // Carga y error de /admin/citas/disponibilidad (US-AGE-01).
  main: 'mx-auto flex max-w-4xl flex-col gap-6 p-6',
  loadingBox: 'flex items-center gap-3 rounded-box border border-base-300 p-10',
  spinner: 'loading loading-spinner',
  errorBox: 'rounded-box border border-error/40 p-10 text-center',
  errorTitle: 'font-serif text-lg',
  errorBody: 'mt-2 text-sm text-base-content/70',
  retryButton: 'btn btn-outline btn-sm mt-4',
}
