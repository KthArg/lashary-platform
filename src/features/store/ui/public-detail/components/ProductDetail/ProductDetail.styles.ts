export const productDetailStyles = {
  wrapper: 'flex flex-col gap-4',
  backButton: 'btn btn-ghost btn-sm w-fit gap-2',
  backIcon: 'h-4 w-4',
  article: 'card bg-base-100 shadow-sm md:card-side',
  figure: 'md:w-1/2',
  image: 'h-80 w-full object-cover md:h-full',
  body: 'card-body gap-4 md:w-1/2',
  title: 'font-serif text-3xl text-brand-dark md:text-4xl',
  price: 'grow-0 text-2xl font-semibold text-primary',
  description: 'grow-0 leading-relaxed text-base-content/80',
  availability: 'grow-0',
  badgeAvailable:
    'inline-flex items-center rounded-full bg-success/30 px-3 py-1 text-sm font-medium text-base-content',
  badgeSoldOut:
    'inline-flex items-center rounded-full bg-error/30 px-3 py-1 text-sm font-medium text-base-content',
  actions: 'card-actions mt-auto justify-end pt-4',
  addToCart: 'btn btn-primary w-full sm:w-auto',
}
