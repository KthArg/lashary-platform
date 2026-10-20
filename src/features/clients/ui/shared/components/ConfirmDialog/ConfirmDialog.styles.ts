export const confirmDialogStyles = {
  backdrop: 'fixed inset-0 z-modal-top flex items-center justify-center bg-black/70 backdrop-blur-sm p-4',
  card: 'w-full max-w-xs bg-white p-7 shadow-2xl border border-brand-border/40 rounded-md text-center',
  title: 'font-serif text-lg text-brand-dark font-normal',
  message: 'text-xs text-brand-muted leading-relaxed mt-2.5',
  actions: 'flex flex-col gap-2 mt-6',
  cancelBtn:
    'w-full bg-brand-dark hover:bg-black text-white text-xs tracking-widest uppercase py-3 px-4 font-medium transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2',
  confirmBtn:
    'w-full bg-white hover:bg-red-50 border border-brand-border text-error text-xs tracking-widest uppercase py-3 px-4 font-medium transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2',
}
