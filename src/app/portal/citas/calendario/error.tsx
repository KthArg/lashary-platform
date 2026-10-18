'use client'

import { clientCalendarMessages } from '@/features/scheduling/client'
import { citasStyles as STYLES } from '../citas.styles'

const errorMessages = clientCalendarMessages.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className={STYLES.errorBox}>
      <p className={STYLES.errorTitle}>{errorMessages.title}</p>
      <p>{errorMessages.body}</p>
      <button type="button" onClick={reset} className={STYLES.retryButton}>
        {errorMessages.retry}
      </button>
    </div>
  )
}
