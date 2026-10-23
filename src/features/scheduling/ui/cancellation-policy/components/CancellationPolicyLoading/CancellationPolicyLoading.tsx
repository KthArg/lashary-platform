import { cancellationPolicyMessages } from '../../constants/cancellation-policy-strings'
import { cancellationPolicyLoadingStyles as STYLES } from './CancellationPolicyLoading.styles'

export function CancellationPolicyLoading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{cancellationPolicyMessages.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.box}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{cancellationPolicyMessages.loading}</span>
      </div>
    </main>
  )
}
