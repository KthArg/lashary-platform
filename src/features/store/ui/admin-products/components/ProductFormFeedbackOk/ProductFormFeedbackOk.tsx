import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'
import type { ProductFormFeedbackOkProps } from './ProductFormFeedbackOk.types'

export function ProductFormFeedbackOk({ message }: ProductFormFeedbackOkProps) {
  return (
    <div role="status" className={STYLES.alertSuccess}>
      <span>{message}</span>
    </div>
  )
}
