'use client'

import { promotionMessages } from '@/features/catalog/client'
import { catalogStyles } from '../catalog.styles'

const adminMessages = promotionMessages.admin

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{adminMessages.title}</h1>
      <div role="alert" className={catalogStyles.errorBox}>
        <h2 className={catalogStyles.errorTitle}>{adminMessages.error.title}</h2>
        <p className={catalogStyles.errorBody}>{adminMessages.error.body}</p>
        <button type="button" onClick={reset} className={catalogStyles.retryButton}>
          {adminMessages.error.retry}
        </button>
      </div>
    </main>
  )
}
