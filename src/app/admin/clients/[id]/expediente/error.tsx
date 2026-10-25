'use client'

import { LoadError, RECORD_LABELS } from '@/features/clients/client'

export default function AdminRecordError({ reset }: { error: Error; reset: () => void }) {
  return <LoadError message={RECORD_LABELS.unexpectedError} retryLabel={RECORD_LABELS.retry} onRetry={reset} />
}
