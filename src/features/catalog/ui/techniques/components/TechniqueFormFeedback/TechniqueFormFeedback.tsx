import { catalogMessages } from '../../constants/technique-strings'
import { techniqueFormFeedbackStyles as STYLES } from './TechniqueFormFeedback.styles'
import type { TechniqueFormFeedbackProps } from './TechniqueFormFeedback.types'

export function TechniqueFormFeedback({ status, message, problems }: TechniqueFormFeedbackProps) {
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
        <p className={STYLES.feedbackTitle}>{catalogMessages.form.validationTitle}</p>
        <ul className={STYLES.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
