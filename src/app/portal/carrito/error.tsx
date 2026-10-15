'use client'

import { CART_PAGE_STRINGS } from '@/features/store/client'
import { carritoStyles as STYLES } from './carrito.styles'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className={STYLES.errorBox}>
      <p className={STYLES.errorTitle}>{CART_PAGE_STRINGS.errorTitle}</p>
      <p>{CART_PAGE_STRINGS.errorBody}</p>
      <button type="button" onClick={reset} className={STYLES.retryButton}>
        {CART_PAGE_STRINGS.retry}
      </button>
    </div>
  )
}
