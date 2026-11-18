import { paymentReminderSettingsMessages as copy } from '../../constants/payment-reminder-settings-strings'
import { paymentReminderSettingsLoadingStyles as STYLES } from './PaymentReminderSettingsLoading.styles'

export function PaymentReminderSettingsLoading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.box}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{copy.loading}</span>
      </div>
    </main>
  )
}
