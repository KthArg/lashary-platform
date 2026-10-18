// Clases de DaisyUI y tokens del tema (UI-001, UI-002). El encabezado y la tarjeta repiten los
// del portal de citas (TechniqueSelector.styles.ts); la carga, la de citas.styles.ts.
export const clientCalendarStyles = {
  main: 'flex flex-col gap-6',
  header: 'border-b border-brand-border pb-4',
  title: 'font-serif text-2xl md:text-3xl font-bold text-brand-dark',
  subtitle: 'text-sm text-brand-muted mt-1',
  card: 'flex flex-col gap-4 rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6 shadow-sm',
  loading: 'rounded-xl border border-brand-border bg-brand-surface p-6 text-sm text-brand-muted shadow-sm',
  pickerForm: 'grid gap-3 sm:grid-cols-4 sm:items-end',
  field: 'form-control w-full sm:col-span-3',
  labelText: 'label-text',
  select: 'select select-bordered w-full',
  submit: 'btn btn-primary',
  // En el teléfono el día va en su propia fila, arriba de los dos botones (UI.md).
  dayNav: 'grid grid-cols-2 items-center gap-2 sm:flex sm:justify-between',
  dayTitle: 'col-span-2 order-first text-center font-serif text-lg text-brand-dark first-letter:uppercase sm:order-none',
  dayLinkPrevious: 'btn btn-ghost btn-sm flex-nowrap whitespace-nowrap justify-self-start',
  dayLinkNext: 'btn btn-ghost btn-sm flex-nowrap whitespace-nowrap justify-self-end',
  dayLinkDisabled: 'btn btn-ghost btn-sm btn-disabled flex-nowrap whitespace-nowrap justify-self-start',
  // En el teléfono no caben "Día anterior" y "Día siguiente" lado a lado: se ve la forma corta.
  labelShort: 'sm:hidden',
  labelLong: 'hidden sm:inline',
  empty: 'rounded-box bg-base-200 p-4 text-sm',
  alertError: 'alert alert-error',
  fieldset: 'flex flex-col gap-3',
  legend: 'text-sm font-semibold text-brand-dark',
  slotGrid: 'grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  slotFree: 'flex cursor-pointer items-center gap-2 rounded-box border border-success bg-success/10 p-2 sm:gap-3 sm:p-3',
  slotBusy: 'flex cursor-not-allowed items-center gap-2 rounded-box border border-base-300 bg-base-200 p-2 opacity-70 sm:gap-3 sm:p-3',
  radio: 'radio radio-sm',
  slotTime: 'flex-1 whitespace-nowrap text-sm font-medium',
  // Relleno: success-content sobre success da 6.59:1; la variante outline daba 2.73:1 (UI-004).
  badgeFree: 'badge badge-success',
  badgeBusy: 'badge badge-ghost',
} as const
