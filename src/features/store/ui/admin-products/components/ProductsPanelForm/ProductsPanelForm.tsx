import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/product-strings'
import { rutasAdminProductos } from '../../constants/product-routes'
import { FormularioProductoAdmin } from '../ProductForm'
import { EncabezadoPanelProductos } from '../ProductsPanelHeader/ProductsPanelHeader'
import { panelAdminProductosStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'
import type { VistaPanelAdminProductos } from '../ProductsAdminPanel/ProductsAdminPanel.data'

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
