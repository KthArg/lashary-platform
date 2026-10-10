import { promotionMessages } from '@/features/catalog/client'
import { catalogStyles } from '../catalog.styles'

const adminMessages = promotionMessages.admin

export default function Loading() {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{adminMessages.title}</h1>
      <div role="status" aria-live="polite" className={catalogStyles.loadingBox}>
        <span className={catalogStyles.spinner} aria-hidden="true" />
        <span>{adminMessages.loading}</span>
      </div>
    </main>
  )
}
