import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { reviewStyles as STYLES } from '@/features/delinquency/ui/review/styles/review.styles'

export function ReviewLoading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.loadingBox}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{copy.loading}</span>
      </div>
    </main>
  )
}
