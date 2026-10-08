'use client'

import { productStrings } from '@/features/store/client'
import { catalogStyles as STYLES } from '../catalog.styles'

const m = productStrings.admin.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{productStrings.admin.title}</h1>
      <div role="alert" className={STYLES.errorBox}>
        <h2 className={STYLES.errorTitle}>{m.title}</h2>
        <p className={STYLES.errorBody}>{m.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {m.retry}
        </button>
      </div>
    </main>
  )
}
