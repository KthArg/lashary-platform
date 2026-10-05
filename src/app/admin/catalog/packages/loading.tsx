import { packageMessages } from '@/features/catalog/client'
import { catalogStyles } from '../catalog.styles'

const m = packageMessages.admin

export default function Loading() {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{m.title}</h1>
      <div role="status" aria-live="polite" className={catalogStyles.loadingBox}>
        <span className={catalogStyles.spinner} aria-hidden="true" />
        <span>{m.loading}</span>
      </div>
    </main>
  )
}
