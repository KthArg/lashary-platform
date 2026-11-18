import Link from 'next/link'
import { PAYMENT_REMINDER_SETTINGS_PATH, paymentReminderSettingsMessages as copy } from '../../constants/payment-reminder-settings-strings'
import { FrequencyDaysForm } from '../FrequencyDaysForm'
import { paymentReminderSettingsViewStyles as STYLES } from './PaymentReminderSettingsView.styles'
import type { PaymentReminderSettingsViewProps } from './PaymentReminderSettingsView.types'

export function PaymentReminderSettingsView({ view }: PaymentReminderSettingsViewProps) {
  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      {view.status === 'ready' ? (
        <section className={STYLES.section}>
          <FrequencyDaysForm frequencyDays={view.frequencyDays} />
        </section>
      ) : (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadFailed}</span>
          <Link href={PAYMENT_REMINDER_SETTINGS_PATH} className={STYLES.action}>
            {copy.reload}
          </Link>
        </div>
      )}
    </main>
  )
}
