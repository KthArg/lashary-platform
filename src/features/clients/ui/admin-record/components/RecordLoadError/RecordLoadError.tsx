'use client'

import { useRouter } from 'next/navigation'
import { RECORD_LABELS } from '../../constants/record-strings'
import { recordLoadErrorStyles as STYLES } from './RecordLoadError.styles'
import type { RecordLoadErrorProps } from './RecordLoadError.types'

export function RecordLoadError({ message, onRetry }: RecordLoadErrorProps) {
  const router = useRouter()
  return (
    <div role="alert" className={STYLES.error}>
      <p>{message}</p>
      <button type="button" className={STYLES.retryButton} onClick={onRetry ?? (() => router.refresh())}>
        {RECORD_LABELS.retry}
      </button>
    </div>
  )
}
