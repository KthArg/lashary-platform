import { isErr, ok, type Result } from '@/shared/result'
import { isPaymentReminderDue } from '../domain/payment-reminder'
import type { ClientOwedAmountPort, DelinquentClientsPort, DuePaymentReminder, PaymentReminderLogPort, RepositoryFailure } from './ports'

export type DiscoverDuePaymentRemindersDeps = {
  listActiveClientIds: DelinquentClientsPort['listActiveClientIds']
  lastSentAt: PaymentReminderLogPort['lastSentAt']
  owedBy: ClientOwedAmountPort['owedBy']
  frequencyDays: number
  now: Date
}

export async function discoverDuePaymentReminders(
  deps: DiscoverDuePaymentRemindersDeps,
): Promise<Result<DuePaymentReminder[], RepositoryFailure>> {
  const activeClientIds = await deps.listActiveClientIds()
  if (isErr(activeClientIds)) return activeClientIds
  if (activeClientIds.value.length === 0) return ok([])

  const lastSent = await deps.lastSentAt(activeClientIds.value)
  if (isErr(lastSent)) return lastSent

  const due: DuePaymentReminder[] = []
  for (const clientId of activeClientIds.value) {
    if (!isPaymentReminderDue(lastSent.value.get(clientId) ?? null, deps.frequencyDays, deps.now)) continue

    const owed = await deps.owedBy(clientId)
    if (isErr(owed)) return owed
    if (owed.value > 0) due.push({ clientId, amountOwed: owed.value })
  }

  return ok(due)
}
