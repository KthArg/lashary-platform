import { productStrings } from '../../constants/product-strings'
import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'
import type { ProductFormFeedbackInvalidProps } from './ProductFormFeedbackInvalid.types'

export function ProductFormFeedbackInvalid({ problems }: ProductFormFeedbackInvalidProps) {
  return (
    <div role="alert" className={STYLES.alertError}>
      <div>
        <p className={STYLES.feedbackTitle}>{productStrings.form.validationTitle}</p>
        <ul className={STYLES.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
