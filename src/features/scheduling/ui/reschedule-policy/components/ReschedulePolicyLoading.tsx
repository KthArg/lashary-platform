import { reschedulePolicyMessages } from '../constants/reschedule-policy-strings'
import { reschedulePolicyStyles as STYLES } from '../styles/reschedule-policy.styles'

export function ReschedulePolicyLoading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{reschedulePolicyMessages.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.loadingBox}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{reschedulePolicyMessages.loading}</span>
      </div>
    </main>
  )
}
