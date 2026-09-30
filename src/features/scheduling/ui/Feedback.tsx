import { schedulingMessages } from './messages'
import { feedbackStyles as s } from './Feedback.styles'
import type { SchedulingActionState } from './action-state'

// Compartido por los tres formularios del panel (weekly/closed/manual) — misma forma de
// estado (SchedulingActionState) para los tres, así que una sola vez basta.
export function Feedback({ status, message, problems }: SchedulingActionState) {
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
        <p className={s.feedbackTitle}>{schedulingMessages.shared.validationTitle}</p>
        <ul className={s.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
