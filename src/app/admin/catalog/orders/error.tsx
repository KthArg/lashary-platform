'use client'

import { orderQueueMessages } from '@/features/store/client'
import { catalogStyles } from '../catalog.styles'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{orderQueueMessages.title}</h1>
      <div role="alert" className={catalogStyles.errorBox}>
        <p className={catalogStyles.errorBody}>{orderQueueMessages.loadError}</p>
        <button type="button" onClick={reset} className={catalogStyles.retryButton}>
          {orderQueueMessages.retry}
        </button>
      </div>
    </main>
  )
}
