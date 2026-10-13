import { packageMessages } from '../../constants/package-strings'
import { packageFormFeedbackStyles as STYLES } from './PackageFormFeedback.styles'
import type { PackageFormFeedbackProps } from './PackageFormFeedback.types'

export function PackageFormFeedback({ status, message, problems }: PackageFormFeedbackProps) {
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
        <p className={STYLES.feedbackTitle}>{packageMessages.form.validationTitle}</p>
        <ul className={STYLES.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
