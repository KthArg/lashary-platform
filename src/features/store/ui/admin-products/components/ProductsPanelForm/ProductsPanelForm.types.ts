import type { ProductsAdminPanelView } from '../ProductsAdminPanel/ProductsAdminPanel.data'

export interface ProductsPanelFormProps {
  view: Extract<ProductsAdminPanelView, { mode: 'form' }>
}
