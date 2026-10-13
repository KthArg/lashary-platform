import { ProductsAdminTable } from '../ProductsAdminTable'
import { ProductsPanelHeader } from '../ProductsPanelHeader'
import { NewProductLink } from '../NewProductLink'
import { productsAdminPanelStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'
import type { ProductsPanelListProps } from './ProductsPanelList.types'

export function ProductsPanelList({ view }: ProductsPanelListProps) {
  return (
    <main className={STYLES.main}>
      <ProductsPanelHeader action={<NewProductLink />} />
      <ProductsAdminTable rows={view.rows} />
    </main>
  )
}
