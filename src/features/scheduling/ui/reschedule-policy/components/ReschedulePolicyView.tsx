import Link from 'next/link'
import { RESCHEDULE_POLICY_PATH, reschedulePolicyMessages } from '../constants/reschedule-policy-strings'
import { reschedulePolicyStyles as STYLES } from '../styles/reschedule-policy.styles'
import type { ReschedulePolicyScreen } from '../types/reschedule-policy.types'
import { ReschedulePolicyForm } from './ReschedulePolicyForm'

export function ReschedulePolicyView({ view }: { view: ReschedulePolicyScreen }) {
  const copy = reschedulePolicyMessages

  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      {view.status === 'ready' ? (
        <section className={STYLES.section}>
          <ReschedulePolicyForm max={view.max} />
        </section>
      ) : (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadFailed}</span>
          <Link href={RESCHEDULE_POLICY_PATH} className={STYLES.action}>
            {copy.reload}
          </Link>
        </div>
      )}
    </main>
  )
}
