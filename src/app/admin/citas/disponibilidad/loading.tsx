import { schedulingMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from '../citas.styles'

const availabilityMessages = schedulingMessages.availability

export default function Loading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{availabilityMessages.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.loadingBox}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{availabilityMessages.loading}</span>
      </div>
    </main>
  )
}
