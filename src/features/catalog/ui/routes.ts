export const CATALOG_ADMIN_PATH = '/admin/catalog'
export const CATALOG_PACKAGES_ADMIN_PATH = '/admin/catalog/packages'
export const CATALOG_PROMOTIONS_ADMIN_PATH = '/admin/catalog/promotions'

export const catalogRoutes = {
  admin: CATALOG_ADMIN_PATH,
  newTechnique: `${CATALOG_ADMIN_PATH}?new`,
  editTechnique: (id: string) => `${CATALOG_ADMIN_PATH}?edit=${id}`,
  packagesAdmin: CATALOG_PACKAGES_ADMIN_PATH,
  newPackage: `${CATALOG_PACKAGES_ADMIN_PATH}?new`,
  editPackage: (id: string) => `${CATALOG_PACKAGES_ADMIN_PATH}?edit=${id}`,
  promotionsAdmin: CATALOG_PROMOTIONS_ADMIN_PATH,
  newPromotion: `${CATALOG_PROMOTIONS_ADMIN_PATH}?new`,
  editPromotion: (id: string) => `${CATALOG_PROMOTIONS_ADMIN_PATH}?edit=${id}`,
}
