import { catalogMessages } from '../../constants/technique-strings'
import { techniqueFormFeedbackStyles as s } from './TechniqueFormFeedback.styles'
import type { TechniqueFormFeedbackProps } from './TechniqueFormFeedback.types'

export function TechniqueFormFeedback({ status, message, problems }: TechniqueFormFeedbackProps) {
  if (status === 'idle') return null
  if (status === 'ok') {
    return (
      <div role="status" className={s.alertSuccess}>
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'forbidden') {
    return (
      <div role="alert" className={s.alertWarning}>
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className={s.alertError}>
      <div>
        <p className={s.feedbackTitle}>{catalogMessages.form.validationTitle}</p>
        <ul className={s.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
