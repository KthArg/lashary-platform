import { formatPriceCrc, type AdminProduct } from '../../../../domain/product'
import { productStrings } from '../../constants/product-strings'
import { productRoutes } from '../../constants/product-routes'
import { tablaProductosAdminStyles as STYLES } from './ProductsAdminTable.styles'
import type { FilaProductoAdmin } from './ProductsAdminTable.types'

export function aFilasProductoAdmin(items: AdminProduct[]): FilaProductoAdmin[] {
  const m = productStrings.admin

  return items.map((producto) => ({
    id: producto.id,
    nombre: producto.name,
    slug: producto.slug,
    precioFormateado: formatPriceCrc(producto.priceCrc),
    orden: producto.displayOrder,
    estadoTexto: producto.isActive ? m.status.active : m.status.inactive,
    estadoClase: producto.isActive ? STYLES.badgeActive : STYLES.badgeInactive,
    hrefEditar: productRoutes.editProduct(producto.id),
  }))
}
