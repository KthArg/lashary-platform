import Link from 'next/link'
import { productStrings } from '../../constants/product-strings'
import { productRoutes } from '../../constants/product-routes'
import { ProductForm } from '../ProductForm'
import { EncabezadoPanelProductos } from '../ProductsPanelHeader/ProductsPanelHeader'
import { panelAdminProductosStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'
import type { VistaPanelAdminProductos } from '../ProductsAdminPanel/ProductsAdminPanel.data'

type Props = { vista: Extract<VistaPanelAdminProductos, { modo: 'formulario' }> }

export function PanelProductosFormulario({ vista }: Props) {
  return (
    <main className={STYLES.main}>
      <EncabezadoPanelProductos />
      <div className={STYLES.formWrapper}>
        <ProductForm product={vista.productoEnEdicion} />
        <Link href={productRoutes.admin} className={STYLES.cancelLink}>
          {productStrings.form.cancel}
        </Link>
      </div>
    </main>
  )
}
