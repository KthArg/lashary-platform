'use client'

import { productStrings } from '@/features/store/client'
import { catalogStyles as STYLES } from '../catalog.styles'

const errorMessages = productStrings.admin.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{productStrings.admin.title}</h1>
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
