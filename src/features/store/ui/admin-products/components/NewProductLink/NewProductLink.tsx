import Link from 'next/link'
import { productStrings } from '../../constants/product-strings'
import { productRoutes } from '../../constants/product-routes'
import { panelAdminProductosStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'

export function EnlaceNuevoProducto() {
  return (
    <Link href={productRoutes.newProduct} className={STYLES.newProductLink}>
      {productStrings.admin.newProduct}
    </Link>
  )
}
