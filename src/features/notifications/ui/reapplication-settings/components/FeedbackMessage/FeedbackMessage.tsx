import { feedbackMessageStyles as STYLES } from './FeedbackMessage.styles'
import type { FeedbackMessageProps } from './FeedbackMessage.types'

// Región viva: el lector de pantalla anuncia el resultado de guardar sin mover el foco.
export function FeedbackMessage({ feedback }: FeedbackMessageProps) {
  return (
    <div role="status" aria-live="polite" className={feedback?.kind === 'error' ? STYLES.feedbackError : STYLES.feedback}>
      {feedback?.text ?? null}
    </div>
  )
}
