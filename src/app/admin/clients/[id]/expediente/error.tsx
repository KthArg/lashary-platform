'use client'

import { RECORD_LABELS, RecordLoadError } from '@/features/clients'
import { adminRecordStyles as STYLES } from './expediente.styles'

export default function AdminRecordError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={STYLES.page}>
      <h1 className={STYLES.title}>{RECORD_LABELS.pageTitle}</h1>
      <RecordLoadError message={RECORD_LABELS.unexpectedError} onRetry={reset} />
    </div>
  )
}
