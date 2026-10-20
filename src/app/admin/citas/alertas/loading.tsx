import { alertsMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from '../citas.styles'

export default function Loading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{alertsMessages.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.loadingBox}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{alertsMessages.loading}</span>
      </div>
    </main>
  )
}
