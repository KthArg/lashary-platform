import type { RetryButtonModel } from '../PublicProductsGrid/PublicProductsGrid.data'

export interface RetryButtonInactiveProps {
  button: Extract<RetryButtonModel, { mode: 'inactive' }>
  label: string
}
