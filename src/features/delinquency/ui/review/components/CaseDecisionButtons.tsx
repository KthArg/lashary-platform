'use client'

import { useState, useTransition } from 'react'
import { decideCaseAction } from '@/features/delinquency/ui/review/actions/review-actions'
import { reviewMessages } from '@/features/delinquency/ui/review/constants/review-strings'
import { reviewStyles as STYLES } from '@/features/delinquency/ui/review/styles/review.styles'

type Feedback = { kind: 'ok'; text: string } | { kind: 'error'; text: string } | null

export function CaseDecisionButtons({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)

  const decide = (decision: 'confirm' | 'dismiss') => {
    setFeedback(null)
    startTransition(async () => {
      const result = await decideCaseAction({ caseId, decision })
      if (!result.ok) {
        setFeedback({ kind: 'error', text: result.error })
        return
      }
      setFeedback({
        kind: 'ok',
        text: result.state === 'active' ? reviewMessages.confirmedNotice : reviewMessages.dismissedNotice,
      })
    })
  }

  return (
    <div>
      <div className={STYLES.actions}>
        <button type="button" className={STYLES.confirmButton} disabled={pending} onClick={() => decide('confirm')}>
          {pending ? reviewMessages.saving : reviewMessages.confirm}
        </button>
        <button type="button" className={STYLES.dismissButton} disabled={pending} onClick={() => decide('dismiss')}>
          {reviewMessages.dismiss}
        </button>
      </div>
      <div role="status" aria-live="polite" className={feedback?.kind === 'error' ? STYLES.feedbackError : STYLES.feedback}>
        {feedback?.text ?? null}
      </div>
    </div>
  )
}
