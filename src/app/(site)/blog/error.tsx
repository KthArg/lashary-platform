'use client'

import { blogMessages } from '@/features/content/client'
import { blogRouteStyles as STYLES } from './blog.styles'

const errorMessages = blogMessages.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main role="alert" className={STYLES.errorBox}>
      <h1 className={STYLES.errorTitle}>{errorMessages.title}</h1>
      <p className={STYLES.errorBody}>{errorMessages.body}</p>
      <button type="button" onClick={reset} className={STYLES.retryButton}>
        {errorMessages.retry}
      </button>
    </main>
  )
}
