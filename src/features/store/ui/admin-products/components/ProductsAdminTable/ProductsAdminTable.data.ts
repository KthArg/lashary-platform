import { formatPriceCrc, type AdminProduct } from '../../../../domain/product'
import { productStrings } from '../../constants/product-strings'
import { productRoutes } from '../../constants/product-routes'
import { productsAdminTableStyles as STYLES } from './ProductsAdminTable.styles'
import type { AdminProductRow } from './ProductsAdminTable.types'

export function toAdminProductRows(items: AdminProduct[]): AdminProductRow[] {
  const adminMessages = productStrings.admin

  return items.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    formattedPrice: formatPriceCrc(product.priceCrc),
    order: product.displayOrder,
    statusText: product.isActive ? adminMessages.status.active : adminMessages.status.inactive,
    statusClass: product.isActive ? STYLES.badgeActive : STYLES.badgeInactive,
    editHref: productRoutes.editProduct(product.id),
  }))
}
