import {
  CADENAS_GRID_PRODUCTOS_ES,
  catalogoProductosDb,
  obtenerEstadoGridProductos,
  type EstadoGridProductos,
} from '@/features/store'

export async function obtenerVistaProductos(): Promise<EstadoGridProductos> {
  const catalogo = catalogoProductosDb()
  return obtenerEstadoGridProductos(catalogo, CADENAS_GRID_PRODUCTOS_ES)
}
