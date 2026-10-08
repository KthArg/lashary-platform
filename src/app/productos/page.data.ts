import {
  CADENAS_GRID_PRODUCTOS_ES,
  publicProductsDb,
  getProductGridState,
  type ProductGridState,
} from '@/features/store'

export async function obtenerVistaProductos(): Promise<ProductGridState> {
  const catalog = publicProductsDb()
  return getProductGridState(catalog, CADENAS_GRID_PRODUCTOS_ES)
}
