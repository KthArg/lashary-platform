import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { FormularioProductoAdmin } from '../FormularioProductoAdmin'
import { TablaProductosAdmin } from '../TablaProductosAdmin'
import { EncabezadoPanelProductos, EnlaceNuevoProducto } from './PanelAdminProductosHeader'
import { panelAdminProductosStyles as s } from './PanelAdminProductos.styles'
import type { VistaPanelAdminProductos } from './PanelAdminProductos.data'

const m = mensajesAdminProductos.admin

export function PanelProductosFormulario({
  vista,
}: {
  vista: Extract<VistaPanelAdminProductos, { modo: 'formulario' }>
}) {
  return (
    <main className={s.main}>
      <EncabezadoPanelProductos />
      <div className={s.formWrapper}>
        <FormularioProductoAdmin producto={vista.productoEnEdicion} />
        <Link href={rutasAdminProductos.admin} className={s.cancelLink}>
          {mensajesAdminProductos.form.cancel}
        </Link>
      </div>
    </main>
  )
}

export function PanelProductosListado({
  vista,
}: {
  vista: Extract<VistaPanelAdminProductos, { modo: 'listado' }>
}) {
  return (
    <main className={s.main}>
      <EncabezadoPanelProductos accion={<EnlaceNuevoProducto />} />
      <TablaProductosAdmin filas={vista.filas} />
    </main>
  )
}

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
