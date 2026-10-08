import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { EncabezadoPanelProductos } from './EncabezadoPanelProductos'
import { EnlaceNuevoProducto } from './EnlaceNuevoProducto'
import { panelAdminProductosStyles as STYLES } from './PanelAdminProductos.styles'

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
