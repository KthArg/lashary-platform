import { promotionMessages } from '../../constants/promotion-strings'
import { promotionFormFeedbackStyles as STYLES } from './PromotionFormFeedback.styles'
import type { PromotionFormFeedbackProps } from './PromotionFormFeedback.types'

export function PromotionFormFeedback({ status, message, problems }: PromotionFormFeedbackProps) {
  if (status === 'idle') return null
  if (status === 'ok') {
    return (
      <div role="status" className={STYLES.alertSuccess}>
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'forbidden') {
    return (
      <div role="alert" className={STYLES.alertWarning}>
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className={STYLES.alertError}>
      <div>
        <p className={STYLES.feedbackTitle}>{promotionMessages.form.validationTitle}</p>
        <ul className={STYLES.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
