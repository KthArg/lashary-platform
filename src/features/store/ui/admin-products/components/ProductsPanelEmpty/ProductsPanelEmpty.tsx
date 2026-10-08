import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/product-strings'
import { rutasAdminProductos } from '../../constants/product-routes'
import { EncabezadoPanelProductos } from '../ProductsPanelHeader/ProductsPanelHeader'
import { EnlaceNuevoProducto } from '../NewProductLink/NewProductLink'
import { panelAdminProductosStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'

const m = mensajesAdminProductos.admin

export function PanelProductosVacio() {
  return (
    <main className={STYLES.main}>
      <EncabezadoPanelProductos accion={<EnlaceNuevoProducto />} />
      <div className={STYLES.emptyBox}>
        <h2 className={STYLES.emptyTitle}>{m.empty.title}</h2>
        <p className={STYLES.emptyBody}>{m.empty.body}</p>
        <Link href={rutasAdminProductos.nuevoProducto} className={STYLES.emptyCta}>
          {m.empty.cta}
        </Link>
      </div>
    </main>
  )
}
