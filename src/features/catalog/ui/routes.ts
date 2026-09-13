export const CATALOG_ADMIN_PATH = '/admin/catalog'

export const catalogRoutes = {
  admin: CATALOG_ADMIN_PATH,
  newTechnique: `${CATALOG_ADMIN_PATH}?new`,
  editTechnique: (id: string) => `${CATALOG_ADMIN_PATH}?edit=${id}`,
}
