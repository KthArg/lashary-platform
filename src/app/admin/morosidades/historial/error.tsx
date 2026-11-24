'use client'

import { HistoryError } from '@/features/delinquency/client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <HistoryError reset={reset} />
}
