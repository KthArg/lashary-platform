import type { ProductsAdminPanelView } from '../ProductsAdminPanel/ProductsAdminPanel.data'

export interface ProductsPanelListProps {
  view: Extract<ProductsAdminPanelView, { mode: 'list' }>
}
