import { ProductFormFeedback } from '../ProductFormFeedback'
import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'
import type { ProductStatusSectionProps } from './ProductStatusSection.types'

export function ProductStatusSection({
  productId,
  statusControl,
  statusAction,
  statusState,
  statusPending,
}: ProductStatusSectionProps) {
  return (
    <form action={statusAction} className={STYLES.statusForm}>
      <input type="hidden" name="id" value={productId} />
      <ProductFormFeedback {...statusState} />
      <button type="submit" className={statusControl.buttonClass} disabled={statusPending}>
        {statusControl.label}
      </button>
    </form>
  )
}
