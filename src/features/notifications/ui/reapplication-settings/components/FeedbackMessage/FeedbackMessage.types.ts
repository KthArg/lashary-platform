export type Feedback = { kind: 'ok'; text: string } | { kind: 'error'; text: string } | null

export interface FeedbackMessageProps {
  feedback: Feedback
}
