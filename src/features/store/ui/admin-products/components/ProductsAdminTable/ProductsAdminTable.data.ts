import { formatPriceCrc, type AdminProduct } from '../../../../domain/product'
import { mensajesAdminProductos } from '../../constants/product-strings'
import { rutasAdminProductos } from '../../constants/product-routes'
import { tablaProductosAdminStyles as STYLES } from './ProductsAdminTable.styles'
import type { FilaProductoAdmin } from './ProductsAdminTable.types'

export function aFilasProductoAdmin(items: AdminProduct[]): FilaProductoAdmin[] {
  const m = mensajesAdminProductos.admin

  return items.map((producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    slug: producto.slug,
    precioFormateado: formatPriceCrc(producto.precioCrc),
    orden: producto.ordenPresentacion,
    estadoTexto: producto.activo ? m.status.active : m.status.inactive,
    estadoClase: producto.activo ? STYLES.badgeActive : STYLES.badgeInactive,
    hrefEditar: rutasAdminProductos.editarProducto(producto.id),
  }))
}
