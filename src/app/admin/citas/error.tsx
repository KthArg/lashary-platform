'use client'

// Ver nota en loading.tsx: el texto viene del entry point cliente-seguro, no del index.ts.
import { schedulingMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from './citas.styles'

const m = schedulingMessages.availability

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{m.title}</h1>
      <div role="alert" className={STYLES.errorBox}>
        <h2 className={STYLES.errorTitle}>{m.error.title}</h2>
        <p className={STYLES.errorBody}>{m.error.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {m.error.retry}
        </button>
      </div>
    </main>
  )
}
