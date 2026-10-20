export const publicDetailRoutes = {
  catalog: '/productos',
  signIn: '/login',
  product: (slug: string) => `/productos/${encodeURIComponent(slug)}`,
} as const
