import type { RetryButtonModel } from '../PublicProductsGrid/PublicProductsGrid.data'

export interface RetryButtonActiveProps {
  button: Extract<RetryButtonModel, { mode: 'active' }>
  label: string
}
