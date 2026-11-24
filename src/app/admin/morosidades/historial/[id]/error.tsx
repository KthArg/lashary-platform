'use client'

import { CaseDetailError } from '@/features/delinquency/client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <CaseDetailError reset={reset} />
}
