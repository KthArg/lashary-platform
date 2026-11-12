import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { reviewLoadingStyles as STYLES } from './ReviewLoading.styles'

export function ReviewLoading() {
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
