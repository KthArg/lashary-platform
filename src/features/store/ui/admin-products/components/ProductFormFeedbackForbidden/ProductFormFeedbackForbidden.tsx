import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'
import type { ProductFormFeedbackForbiddenProps } from './ProductFormFeedbackForbidden.types'

export function ProductFormFeedbackForbidden({ message }: ProductFormFeedbackForbiddenProps) {
  return (
    <div role="alert" className={STYLES.alertWarning}>
      <span>{message}</span>
    </div>
  )
}
