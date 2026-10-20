const addTileBase =
  'flex h-full w-full flex-col items-center justify-center gap-1 border border-dashed border-brand-border p-3 text-center text-xs text-brand-dark transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-dark'

export const imagesEditorStyles = {
  editor: 'space-y-3',
  muted: 'text-sm italic text-brand-muted/70',
  grid: 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
  tile: 'relative aspect-square overflow-hidden border border-brand-border/60 bg-white',
  tileButton: 'block h-full w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-dark',
  image: 'h-full w-full object-cover transition-transform hover:scale-105',
  unavailable: 'flex h-full items-center justify-center p-2 text-center text-xs text-brand-muted',
  addTile: `${addTileBase} cursor-pointer hover:border-brand-gold`,
  addTileBusy: `${addTileBase} cursor-wait opacity-60`,
  addIcon: 'h-6 w-6 text-brand-gold',
  hint: 'text-2xs text-brand-muted',
  fileInput: 'peer sr-only',
  alert: 'p-3 bg-red-50 border border-red-200 text-error text-xs',
}
