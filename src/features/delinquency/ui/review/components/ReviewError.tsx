'use client'

import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { reviewStyles as STYLES } from '@/features/delinquency/ui/review/styles/review.styles'

export function ReviewError({ reset }: { reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      <div role="alert" className={STYLES.errorBox}>
        <h2 className={STYLES.errorTitle}>{copy.error.title}</h2>
        <p className={STYLES.errorBody}>{copy.error.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {copy.error.retry}
        </button>
      </div>
    </main>
  )
}
