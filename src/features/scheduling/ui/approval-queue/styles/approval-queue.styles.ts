const BUTTON_BASE =
  'px-4 py-2 text-xs tracking-widest uppercase cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark'

export const approvalQueueStyles = {
  section: 'mt-8',
  title: 'font-serif text-lg text-brand-dark font-normal',
  list: 'mt-4 divide-y divide-brand-border/60 border-y border-brand-border/60',
  item: 'flex flex-wrap items-start justify-between gap-4 py-4',
  slot: 'text-sm text-brand-dark capitalize',
  actions: 'flex flex-wrap gap-2',
  primaryButton: `${BUTTON_BASE} bg-brand-dark text-white hover:bg-brand-gold`,
  secondaryButton: `${BUTTON_BASE} bg-white border border-brand-border text-brand-dark hover:border-brand-gold`,
  rejectForm: 'flex w-full flex-col gap-2',
  reasonLabel: 'text-xs uppercase tracking-widest text-brand-muted',
  reasonField:
    'w-full border border-brand-border bg-white p-2 text-sm text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-dark',
  message: 'mt-4 py-8 text-sm text-brand-muted',
  error: 'mt-4 flex flex-wrap items-center justify-between gap-4 p-3 bg-red-50 border border-red-200 text-error text-sm',
  decisionError: 'mt-4 p-3 bg-red-50 border border-red-200 text-error text-sm',
}
