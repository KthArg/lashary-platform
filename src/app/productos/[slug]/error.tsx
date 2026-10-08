'use client'

import { PUBLIC_DETAIL_STRINGS } from '@/features/store/client'
import { productDetailPageStyles as STYLES } from './product-detail-page.styles'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        <div role="alert" className={STYLES.errorBox}>
          <h1 className={STYLES.boxTitle}>{PUBLIC_DETAIL_STRINGS.errorTitle}</h1>
          <p>{PUBLIC_DETAIL_STRINGS.errorBody}</p>
          <button type="button" onClick={reset} className={STYLES.retryButton}>
            {PUBLIC_DETAIL_STRINGS.retry}
          </button>
        </div>
      </div>
    </main>
  )
}
