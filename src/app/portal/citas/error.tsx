'use client'

import { schedulingMessages } from '@/features/scheduling/client'
import { citasStyles as s } from './citas.styles'

const m = schedulingMessages.page.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className={s.errorBox}>
      <p className={s.errorTitle}>{m.title}</p>
      <p>{m.body}</p>
      <button type="button" onClick={reset} className={s.retryButton}>
        {m.retry}
      </button>
    </div>
  )
}
