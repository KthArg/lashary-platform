import type { ProductActionState } from '../../types/product-action-state'

export interface DeactivateSectionProps {
  productId: string
  deactivateAction: (formData: FormData) => void
  deactivateState: ProductActionState
  deactivating: boolean
}
