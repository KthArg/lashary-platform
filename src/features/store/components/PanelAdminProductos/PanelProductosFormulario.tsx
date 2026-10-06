import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { FormularioProductoAdmin } from '../FormularioProductoAdmin'
import { EncabezadoPanelProductos } from './EncabezadoPanelProductos'
import { panelAdminProductosStyles as s } from './PanelAdminProductos.styles'
import type { VistaPanelAdminProductos } from './PanelAdminProductos.data'

type Props = { vista: Extract<VistaPanelAdminProductos, { modo: 'formulario' }> }

export function PanelProductosFormulario({ vista }: Props) {
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
