import { caseDetailMessages as copy } from '../../constants/case-detail-strings'
import { caseDetailLoadingStyles as STYLES } from './CaseDetailLoading.styles'

export function CaseDetailLoading() {
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
