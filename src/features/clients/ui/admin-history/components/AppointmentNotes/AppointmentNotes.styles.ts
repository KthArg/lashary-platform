const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark'

export const appointmentNotesStyles = {
  notes: 'min-w-56 space-y-2',
  empty: 'text-sm italic text-brand-muted/70',
  list: 'space-y-2',
  item: 'space-y-1',
  body: 'whitespace-pre-line text-sm text-brand-dark',
  dates: 'text-xs text-brand-muted',
  itemActions: 'flex items-center gap-3',
  textButton: `text-xs uppercase tracking-widest text-brand-muted cursor-pointer transition-colors hover:text-brand-dark disabled:opacity-60 ${FOCUS_RING}`,
  form: 'space-y-2',
  fieldLabel: 'block text-2xs uppercase tracking-widest text-brand-muted font-medium',
  input: 'w-full bg-white border border-brand-border px-3 py-2 text-sm text-brand-dark focus:outline-none focus:border-brand-gold transition-colors rounded-none',
  actions: 'flex items-center gap-3',
  cancelButton: 'bg-white border border-brand-border hover:border-brand-gold text-brand-dark text-xs tracking-widest uppercase py-2 px-3 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
  saveButton: 'bg-brand-dark hover:bg-black text-white text-xs tracking-widest uppercase py-2 px-3 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
  alert: 'p-2 bg-red-50 border border-red-200 text-error text-xs',
}
