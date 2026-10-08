import Link from 'next/link'
import { productStrings } from '../../constants/product-strings'
import { productRoutes } from '../../constants/product-routes'
import { EncabezadoPanelProductos } from '../ProductsPanelHeader/ProductsPanelHeader'
import { EnlaceNuevoProducto } from '../NewProductLink/NewProductLink'
import { panelAdminProductosStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'

const m = productStrings.admin

export function PanelProductosVacio() {
  return (
    <main className={STYLES.main}>
      <EncabezadoPanelProductos accion={<EnlaceNuevoProducto />} />
      <div className={STYLES.emptyBox}>
        <h2 className={STYLES.emptyTitle}>{m.empty.title}</h2>
        <p className={STYLES.emptyBody}>{m.empty.body}</p>
        <Link href={productRoutes.newProduct} className={STYLES.emptyCta}>
          {m.empty.cta}
        </Link>
      </div>
    </main>
  )
}
