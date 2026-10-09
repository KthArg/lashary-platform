import {
  PUBLIC_GRID_STRINGS,
  publicProductsDb,
  getProductGridState,
  type ProductGridState,
} from '@/features/store'

export async function getProductsView(): Promise<ProductGridState> {
  const catalog = publicProductsDb()
  return getProductGridState(catalog, PUBLIC_GRID_STRINGS)
}
