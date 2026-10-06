import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { FormularioProductoAdmin } from '../FormularioProductoAdmin'
import { EncabezadoPanelProductos } from './EncabezadoPanelProductos'
import { panelAdminProductosStyles as STYLES } from './PanelAdminProductos.styles'
import type { VistaPanelAdminProductos } from './PanelAdminProductos.data'

type Props = { vista: Extract<VistaPanelAdminProductos, { modo: 'formulario' }> }

export function PanelProductosFormulario({ vista }: Props) {
  return (
    <main className={STYLES.main}>
      <EncabezadoPanelProductos />
      <div className={STYLES.formWrapper}>
        <FormularioProductoAdmin producto={vista.productoEnEdicion} />
        <Link href={rutasAdminProductos.admin} className={STYLES.cancelLink}>
          {mensajesAdminProductos.form.cancel}
        </Link>
      </div>
    </main>
  )
}
