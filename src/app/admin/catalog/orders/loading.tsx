import { orderQueueMessages } from '@/features/store/client'
import { catalogStyles } from '../catalog.styles'

export default function Loading() {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{orderQueueMessages.title}</h1>
      <div role="status" aria-live="polite" className={catalogStyles.loadingBox}>
        <span className={catalogStyles.spinner} aria-hidden="true" />
      </div>
    </main>
  )
}
