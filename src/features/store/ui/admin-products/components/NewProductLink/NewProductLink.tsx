import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/product-strings'
import { rutasAdminProductos } from '../../constants/product-routes'
import { panelAdminProductosStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'

export function EnlaceNuevoProducto() {
  return (
    <Link href={rutasAdminProductos.nuevoProducto} className={STYLES.newProductLink}>
      {mensajesAdminProductos.admin.newProduct}
    </Link>
  )
}
