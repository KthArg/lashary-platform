import type { ExemptClientActionState } from '../../types/exempt-client-action-state'

export interface ExemptClientFeedbackProps {
  status: ExemptClientActionState['status']
  message?: string
  problems?: string[]
}
