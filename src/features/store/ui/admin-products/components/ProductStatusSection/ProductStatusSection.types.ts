import type { ProductActionState } from '../../types/product-action-state'
import type { ProductStatusControl } from './ProductStatusSection.data'

export interface ProductStatusSectionProps {
  productId: string
  statusControl: ProductStatusControl
  statusAction: (formData: FormData) => void
  statusState: ProductActionState
  statusPending: boolean
}
