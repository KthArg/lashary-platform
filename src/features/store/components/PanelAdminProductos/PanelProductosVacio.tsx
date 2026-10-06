import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { EncabezadoPanelProductos } from './EncabezadoPanelProductos'
import { EnlaceNuevoProducto } from './EnlaceNuevoProducto'
import { panelAdminProductosStyles as s } from './PanelAdminProductos.styles'

const m = mensajesAdminProductos.admin

export function PanelProductosVacio() {
  return (
    <main className={s.main}>
      <EncabezadoPanelProductos accion={<EnlaceNuevoProducto />} />
      <div className={s.emptyBox}>
        <h2 className={s.emptyTitle}>{m.empty.title}</h2>
        <p className={s.emptyBody}>{m.empty.body}</p>
        <Link href={rutasAdminProductos.nuevoProducto} className={s.emptyCta}>
          {m.empty.cta}
        </Link>
      </div>
    </main>
  )
}
