import {
  CADENAS_GRID_PRODUCTOS_ES,
  publicProductsDb,
  getProductGridState,
  type ProductGridState,
} from '@/features/store'

export async function obtenerVistaProductos(): Promise<ProductGridState> {
  const catalogo = publicProductsDb()
  return getProductGridState(catalogo, CADENAS_GRID_PRODUCTOS_ES)
}
