'use client'

import { useRouter } from 'next/navigation'
import { loadErrorStyles as STYLES } from './LoadError.styles'
import type { LoadErrorProps } from './LoadError.types'

export function LoadError({ message, retryLabel, onRetry }: LoadErrorProps) {
  const router = useRouter()
  return (
    <div role="alert" className={STYLES.error}>
      <p>{message}</p>
      <button type="button" className={STYLES.retryButton} onClick={onRetry ?? (() => router.refresh())}>
        {retryLabel}
      </button>
    </div>
  )
}
