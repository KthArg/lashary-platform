const roundButton =
  'absolute flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-brand-dark cursor-pointer transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

export const imageViewerStyles = {
  backdrop: 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 sm:p-12',
  image: 'max-h-full max-w-full object-contain',
  close: `${roundButton} right-4 top-4`,
  previous: `${roundButton} left-4 top-1/2 -translate-y-1/2`,
  next: `${roundButton} right-4 top-1/2 -translate-y-1/2`,
  icon: 'h-5 w-5',
}
