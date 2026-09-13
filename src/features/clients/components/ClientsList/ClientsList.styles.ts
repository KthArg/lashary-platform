export const clientsListStyles = {
  section: 'mt-8',
  title: 'font-serif text-lg text-brand-dark font-normal',
  list: 'mt-4 divide-y divide-brand-border/60 border-y border-brand-border/60',
  row: 'flex items-center justify-between gap-4 py-2',
  name: 'text-sm text-brand-dark',
  // 40x40 de area tactil aunque el lapiz mida 16: un boton de icono no se toca con el dedo si no (UI-004).
  editButton:
    'inline-flex h-10 w-10 items-center justify-center text-brand-muted cursor-pointer transition-colors hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark',
  editIcon: 'h-4 w-4',
  empty: 'mt-4 py-8 text-sm text-brand-muted',
}
