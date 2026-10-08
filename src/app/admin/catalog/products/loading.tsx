import { productStrings } from '@/features/store/client'
import { catalogStyles as STYLES } from '../catalog.styles'

export default function Loading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{productStrings.admin.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.loadingBox}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{productStrings.admin.loading}</span>
      </div>
    </main>
  )
}
