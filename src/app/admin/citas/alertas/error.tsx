'use client'

import { alertsMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from '../citas.styles'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{alertsMessages.title}</h1>
      <div role="alert" className={STYLES.errorBox}>
        <h2 className={STYLES.errorTitle}>{alertsMessages.error.title}</h2>
        <p className={STYLES.errorBody}>{alertsMessages.error.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {alertsMessages.error.retry}
        </button>
      </div>
    </main>
  )
}
