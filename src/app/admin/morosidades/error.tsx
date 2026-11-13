'use client'

import { ReviewError } from '@/features/delinquency/client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ReviewError reset={reset} />
}
