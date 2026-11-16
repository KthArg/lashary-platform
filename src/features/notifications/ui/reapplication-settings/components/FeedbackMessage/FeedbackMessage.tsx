import { feedbackMessageStyles as STYLES } from './FeedbackMessage.styles'
import type { FeedbackMessageProps } from './FeedbackMessage.types'

export function FeedbackMessage({ feedback }: FeedbackMessageProps) {
  return (
    <div role="status" aria-live="polite" className={feedback?.kind === 'error' ? STYLES.feedbackError : STYLES.feedback}>
      {feedback?.text ?? null}
    </div>
  )
}
