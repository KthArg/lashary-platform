import { isErr, ok, type Result } from '@/shared/result'
import { isPaymentReminderDue } from '../domain/payment-reminder'
import type { ActiveDebtsPort, DuePaymentReminder, PaymentReminderLogPort, RepositoryFailure } from './ports'

export type DiscoverDuePaymentRemindersDeps = {
  listOwedByClient: ActiveDebtsPort['listOwedByClient']
  lastSentAt: PaymentReminderLogPort['lastSentAt']
  frequencyDays: number
  now: Date
}

export async function discoverDuePaymentReminders(
  deps: DiscoverDuePaymentRemindersDeps,
): Promise<Result<DuePaymentReminder[], RepositoryFailure>> {
  const owedByClient = await deps.listOwedByClient()
  if (isErr(owedByClient)) return owedByClient
  if (owedByClient.value.size === 0) return ok([])

  const lastSent = await deps.lastSentAt([...owedByClient.value.keys()])
  if (isErr(lastSent)) return lastSent

  const due: DuePaymentReminder[] = []
  for (const [clientId, amountOwed] of owedByClient.value) {
    if (isPaymentReminderDue(lastSent.value.get(clientId) ?? null, deps.frequencyDays, deps.now)) due.push({ clientId, amountOwed })
  }

  return ok(due)
}
