import Link from 'next/link'
import { CANCELLATION_POLICY_PATH, cancellationPolicyMessages } from '../../constants/cancellation-policy-strings'
import { CancellationPolicyForm } from '../CancellationPolicyForm'
import { cancellationPolicyViewStyles as STYLES } from './CancellationPolicyView.styles'
import type { CancellationPolicyViewProps } from './CancellationPolicyView.types'

export function CancellationPolicyView({ view }: CancellationPolicyViewProps) {
  const copy = cancellationPolicyMessages

  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      {view.status === 'ready' ? (
        <section className={STYLES.section}>
          <CancellationPolicyForm hours={view.hours} />
        </section>
      ) : (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadFailed}</span>
          <Link href={CANCELLATION_POLICY_PATH} className={STYLES.action}>
            {copy.reload}
          </Link>
        </div>
      )}
    </main>
  )
}
