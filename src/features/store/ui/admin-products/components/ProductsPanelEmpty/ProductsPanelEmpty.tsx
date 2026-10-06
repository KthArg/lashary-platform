import Link from 'next/link'
import { productStrings } from '../../constants/product-strings'
import { productRoutes } from '../../constants/product-routes'
import { ProductsPanelHeader } from '../ProductsPanelHeader'
import { NewProductLink } from '../NewProductLink'
import { productsAdminPanelStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'

const adminMessages = productStrings.admin

export function ProductsPanelEmpty() {
  return (
    <main className={STYLES.main}>
      <ProductsPanelHeader action={<NewProductLink />} />
      <div className={STYLES.emptyBox}>
        <h2 className={STYLES.emptyTitle}>{adminMessages.empty.title}</h2>
        <p className={STYLES.emptyBody}>{adminMessages.empty.body}</p>
        <Link href={productRoutes.newProduct} className={STYLES.emptyCta}>
          {adminMessages.empty.cta}
        </Link>
      </div>
    </main>
  )
}
