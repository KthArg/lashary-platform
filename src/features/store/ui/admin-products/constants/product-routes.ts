export const ADMIN_PRODUCTS_ROUTE = '/admin/catalog/products'

export const productRoutes = {
  admin: ADMIN_PRODUCTS_ROUTE,
  newProduct: `${ADMIN_PRODUCTS_ROUTE}?new`,
  editProduct: (id: string) => `${ADMIN_PRODUCTS_ROUTE}?edit=${id}`,
}
