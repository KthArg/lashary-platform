'use client'

import { checkoutMessages } from '@/features/store/client'
import { finalizarStyles as STYLES } from './finalizar.styles'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className={STYLES.errorBox}>
      <p className={STYLES.errorTitle}>{checkoutMessages.errorTitle}</p>
      <p>{checkoutMessages.errorBody}</p>
      <button type="button" onClick={reset} className={STYLES.retryButton}>
        {checkoutMessages.retry}
      </button>
    </div>
  )
}
