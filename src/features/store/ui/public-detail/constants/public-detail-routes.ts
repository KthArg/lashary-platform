export const publicDetailRoutes = {
  catalog: '/productos',
  product: (slug: string) => `/productos/${encodeURIComponent(slug)}`,
} as const
