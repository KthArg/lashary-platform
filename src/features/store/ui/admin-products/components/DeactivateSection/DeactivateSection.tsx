import { productStrings } from '../../constants/product-strings'
import { ProductFormFeedback } from '../ProductFormFeedback'
import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'
import type { DeactivateSectionProps } from './DeactivateSection.types'

export function DeactivateSection({
  productId,
  deactivateAction,
  deactivateState,
  deactivating,
}: DeactivateSectionProps) {
  return (
    <form action={deactivateAction} className={STYLES.deactivateForm}>
      <input type="hidden" name="id" value={productId} />
      <ProductFormFeedback {...deactivateState} />
      <button type="submit" className={STYLES.deactivateButton} disabled={deactivating}>
        {productStrings.admin.rowActions.deactivate}
      </button>
    </form>
  )
}
