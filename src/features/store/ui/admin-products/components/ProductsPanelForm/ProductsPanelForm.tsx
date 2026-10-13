import Link from 'next/link'
import { productStrings } from '../../constants/product-strings'
import { productRoutes } from '../../constants/product-routes'
import { ProductForm } from '../ProductForm'
import { ProductsPanelHeader } from '../ProductsPanelHeader'
import { productsAdminPanelStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'
import type { ProductsPanelFormProps } from './ProductsPanelForm.types'

export function ProductsPanelForm({ view }: ProductsPanelFormProps) {
  return (
    <main className={STYLES.main}>
      <ProductsPanelHeader />
      <div className={STYLES.formWrapper}>
        <ProductForm product={view.editingProduct} />
        <Link href={productRoutes.admin} className={STYLES.cancelLink}>
          {productStrings.form.cancel}
        </Link>
      </div>
    </main>
  )
}
