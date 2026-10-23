'use client'

import { HISTORY_LABELS, LoadError } from '@/features/clients/client'

export default function AdminAppointmentsError({ reset }: { error: Error; reset: () => void }) {
  return <LoadError message={HISTORY_LABELS.unexpectedError} retryLabel={HISTORY_LABELS.retry} onRetry={reset} />
}
