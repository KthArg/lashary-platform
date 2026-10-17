import { exemptionMessages } from '../../constants/exemption-strings'
import { exemptClientFormStyles as STYLES } from '../ExemptClientForm/ExemptClientForm.styles'
import type { ExemptClientFeedbackProps } from './ExemptClientFeedback.types'

export function ExemptClientFeedback({ status, message, problems }: ExemptClientFeedbackProps) {
  if (status === 'idle') return null
  if (status === 'ok') {
    return (
      <div role="status" className={STYLES.alertSuccess}>
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'forbidden' || status === 'conflict') {
    return (
      <div role="alert" className={STYLES.alertWarning}>
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className={STYLES.alertError}>
      <div>
        <p className={STYLES.feedbackTitle}>{exemptionMessages.validationTitle}</p>
        <ul className={STYLES.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
