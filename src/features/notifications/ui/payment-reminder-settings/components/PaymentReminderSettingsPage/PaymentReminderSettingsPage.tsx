import { paymentReminderSettingsService } from '../../services/payment-reminder-settings-service'
import { PaymentReminderSettingsView } from '../PaymentReminderSettingsView'

export async function PaymentReminderSettingsPage() {
  return <PaymentReminderSettingsView view={await paymentReminderSettingsService.load()} />
}
