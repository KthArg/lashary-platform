'use client'

import { schedulingMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from '../citas.styles'

const availabilityMessages = schedulingMessages.availability

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{availabilityMessages.title}</h1>
      <div role="alert" className={STYLES.errorBox}>
        <h2 className={STYLES.errorTitle}>{availabilityMessages.error.title}</h2>
        <p className={STYLES.errorBody}>{availabilityMessages.error.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {availabilityMessages.error.retry}
        </button>
      </div>
    </main>
  )
}
