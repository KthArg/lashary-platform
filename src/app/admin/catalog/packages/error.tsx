'use client'

// Ver nota en ../error.tsx: el texto viene del entry point cliente-seguro, no del index.ts.
import { catalogMessages } from '@/features/catalog/client'
import { catalogStyles } from '../catalog.styles'

const m = catalogMessages.packages.admin

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{m.title}</h1>
      <div role="alert" className={catalogStyles.errorBox}>
        <h2 className={catalogStyles.errorTitle}>{m.error.title}</h2>
        <p className={catalogStyles.errorBody}>{m.error.body}</p>
        <button type="button" onClick={reset} className={catalogStyles.retryButton}>
          {m.error.retry}
        </button>
      </div>
    </main>
  )
}
