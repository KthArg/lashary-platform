'use client'

import { RECORD_LABELS, RecordLoadError } from '@/features/clients'

export default function AdminRecordError({ reset }: { error: Error; reset: () => void }) {
  return <RecordLoadError message={RECORD_LABELS.unexpectedError} onRetry={reset} />
}
