'use client'

import { inactiveClientsMessages } from '@/features/notifications/client'
import { inactiveClientsRouteStyles as STYLES } from './inactivas.styles'

const errorMessages = inactiveClientsMessages.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{inactiveClientsMessages.title}</h1>
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
