'use client'

import { reschedulePolicyMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from '../citas.styles'

const errorMessages = reschedulePolicyMessages.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{reschedulePolicyMessages.title}</h1>
      <div role="alert" className={STYLES.errorBox}>
        <h2 className={STYLES.errorTitle}>{errorMessages.title}</h2>
        <p className={STYLES.errorBody}>{errorMessages.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {errorMessages.retry}
        </button>
      </div>
    </main>
  )
}
