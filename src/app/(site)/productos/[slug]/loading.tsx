import { PUBLIC_DETAIL_STRINGS } from '@/features/store/client'
import { productDetailPageStyles as STYLES } from './product-detail-page.styles'

export default function Loading() {
  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        <div role="status" aria-live="polite" className={STYLES.statusBox}>
          <span>{PUBLIC_DETAIL_STRINGS.loading}</span>
        </div>
      </div>
    </main>
  )
}
