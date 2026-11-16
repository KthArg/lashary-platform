'use client'

import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { reviewErrorStyles as STYLES } from './ReviewError.styles'
import type { ReviewErrorProps } from './ReviewError.types'

export function ReviewError({ reset }: ReviewErrorProps) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      <div role="alert" className={STYLES.box}>
        <h2 className={STYLES.boxTitle}>{copy.error.title}</h2>
        <p className={STYLES.boxBody}>{copy.error.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {copy.error.retry}
        </button>
      </div>
    </main>
  )
}
