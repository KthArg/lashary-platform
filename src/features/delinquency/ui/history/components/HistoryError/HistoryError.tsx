'use client'

import { historyMessages as copy } from '../../constants/history-strings'
import { historyErrorStyles as STYLES } from './HistoryError.styles'
import type { HistoryErrorProps } from './HistoryError.types'

export function HistoryError({ reset }: HistoryErrorProps) {
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
