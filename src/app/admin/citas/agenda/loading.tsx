import { dailyAgendaMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from '../citas.styles'

export default function Loading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{dailyAgendaMessages.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.loadingBox}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{dailyAgendaMessages.loading}</span>
      </div>
    </main>
  )
}
