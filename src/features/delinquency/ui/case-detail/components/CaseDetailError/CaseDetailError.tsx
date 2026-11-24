'use client'

import { caseDetailMessages as copy } from '../../constants/case-detail-strings'
import { caseDetailErrorStyles as STYLES } from './CaseDetailError.styles'
import type { CaseDetailErrorProps } from './CaseDetailError.types'

export function CaseDetailError({ reset }: CaseDetailErrorProps) {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      <div role="alert" className={STYLES.box}>
        <h2 className={STYLES.boxTitle}>{copy.error.title}</h2>
        <p className={STYLES.boxBody}>{copy.error.body}</p>
        <button type="button" onClick={reset} className={STYLES.retryButton}>
          {copy.retry}
        </button>
      </div>
    </main>
  )
}
