'use client'

import { blogMessages } from '@/features/content/client'
import { blogRouteStyles as s } from './blog.styles'

const m = blogMessages.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main role="alert" className={s.errorBox}>
      <h1 className={s.errorTitle}>{m.title}</h1>
      <p className={s.errorBody}>{m.body}</p>
      <button type="button" onClick={reset} className={s.retryButton}>
        {m.retry}
      </button>
    </main>
  )
}
