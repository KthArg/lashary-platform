import { historyMessages as copy } from '../../constants/history-strings'
import { historyLoadingStyles as STYLES } from './HistoryLoading.styles'

export function HistoryLoading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.box}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{copy.loading}</span>
      </div>
    </main>
  )
}
