'use client'

import { dailyAgendaMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from '../citas.styles'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{dailyAgendaMessages.title}</h1>
      <div role="alert" className={STYLES.errorBox}>
        <h2 className={STYLES.errorTitle}>{dailyAgendaMessages.error.title}</h2>
        <p className={STYLES.errorBody}>{dailyAgendaMessages.error.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {dailyAgendaMessages.error.retry}
        </button>
      </div>
    </main>
  )
}
