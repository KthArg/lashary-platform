// Estilos de la galería antes y después (US-LAND-03), tomados del diseño "LASHARY Beauty Studio".
// Solo tokens del tema `lashary-site` (UI-002): los valores del diseño viven en tailwind.config.js.
export const landingGalleryStyles = {
  // Bloque oscuro de ancho completo, como en el diseño.
  section: 'scroll-mt-site-anchor bg-site-night text-site-paper',
  inner: 'mx-auto max-w-site px-site-gutter py-site-section',

  heading: 'mb-site-heading-gap flex items-baseline gap-site-row-gap',
  title: 'm-0 whitespace-nowrap font-site-display text-site-section-title',
  rule: 'h-px flex-auto bg-site-night-rule',
  index: 'font-site-display text-site-section-index text-site-taupe',

  filters: 'mb-site-heading-gap flex flex-wrap gap-x-site-row-gap gap-y-1',
  filter:
    'inline-flex min-h-site-tap cursor-pointer items-center border-b border-transparent bg-transparent font-site-sans text-site-cta text-site-taupe outline-offset-4 transition-colors duration-200 ease-site-out hover:text-site-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-focus motion-reduce:transition-none',
  filterActive: 'border-site-paper text-site-paper',

  grid: 'm-0 grid list-none grid-cols-site-gallery gap-2 p-0 sm:gap-4',
  // Un par: las dos fotos lado a lado, cada una con su etiqueta.
  tile: 'flex w-full gap-1',
  tileIn: 'animate-site-in-quick motion-reduce:animate-none',
  half: 'relative m-0 aspect-site-gallery flex-1 overflow-hidden bg-site-taupe',
  photo: 'object-cover',
  label:
    'absolute bottom-2 left-2 bg-site-paper px-2 py-1 font-site-sans text-site-caption text-site-ink',

  empty: 'm-0 max-w-site-technique-desc text-site-body leading-site-loose text-site-taupe',
}
