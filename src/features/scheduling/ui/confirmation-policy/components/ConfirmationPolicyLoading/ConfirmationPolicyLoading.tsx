import { confirmationPolicyMessages } from '../../constants/confirmation-policy-strings'
import { confirmationPolicyLoadingStyles as STYLES } from './ConfirmationPolicyLoading.styles'

export function ConfirmationPolicyLoading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{confirmationPolicyMessages.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.box}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{confirmationPolicyMessages.loading}</span>
      </div>
    </main>
  )
}
