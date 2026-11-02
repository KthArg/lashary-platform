import { catalogMessages } from '@/features/catalog/client'
import { catalogStyles } from './catalog.styles'

export default function Loading() {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{catalogMessages.admin.title}</h1>
      <div role="status" aria-live="polite" className={catalogStyles.loadingBox}>
        <span className={catalogStyles.spinner} aria-hidden="true" />
        <span>{catalogMessages.admin.loading}</span>
      </div>
    </main>
  )
}
