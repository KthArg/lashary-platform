import Link from 'next/link'
import { CONFIRMATION_POLICY_PATH, confirmationPolicyMessages } from '../../constants/confirmation-policy-strings'
import { ConfirmationPolicyForm } from '../ConfirmationPolicyForm'
import { confirmationPolicyViewStyles as STYLES } from './ConfirmationPolicyView.styles'
import type { ConfirmationPolicyViewProps } from './ConfirmationPolicyView.types'

export function ConfirmationPolicyView({ view }: ConfirmationPolicyViewProps) {
  const copy = confirmationPolicyMessages

  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      {view.status === 'ready' ? (
        <section className={STYLES.section}>
          <ConfirmationPolicyForm hours={view.hours} />
        </section>
      ) : (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadFailed}</span>
          <Link href={CONFIRMATION_POLICY_PATH} className={STYLES.action}>
            {copy.reload}
          </Link>
        </div>
      )}
    </main>
  )
}
