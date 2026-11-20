import { isErr, ok, type Result } from '@/shared/result'
import { logError } from '@/shared/logger'
import { isPaymentReminderDue } from '../domain/payment-reminder'
import type { ClientOwedAmountPort, DelinquentClientsPort, DuePaymentReminder, PaymentReminderLogPort, RepositoryFailure } from './ports'

export type DiscoverDuePaymentRemindersDeps = {
  listActiveClientIds: DelinquentClientsPort['listActiveClientIds']
  lastSentAt: PaymentReminderLogPort['lastSentAt']
  owedBy: ClientOwedAmountPort['owedBy']
  frequencyDays: number
  now: Date
}

export type DiscoverDuePaymentRemindersResult = { due: DuePaymentReminder[]; errored: number }

export async function discoverDuePaymentReminders(
  deps: DiscoverDuePaymentRemindersDeps,
): Promise<Result<DiscoverDuePaymentRemindersResult, RepositoryFailure>> {
  const activeClientIds = await deps.listActiveClientIds()
  if (isErr(activeClientIds)) return activeClientIds
  if (activeClientIds.value.length === 0) return ok({ due: [], errored: 0 })

  const lastSent = await deps.lastSentAt(activeClientIds.value)
  if (isErr(lastSent)) return lastSent

  const due: DuePaymentReminder[] = []
  let errored = 0
  for (const clientId of activeClientIds.value) {
    if (!isPaymentReminderDue(lastSent.value.get(clientId) ?? null, deps.frequencyDays, deps.now)) continue

    const owed = await deps.owedBy(clientId)
    if (isErr(owed)) {
      logError('notifications', `no se pudo leer el saldo de ${clientId} para el recordatorio de pago`, owed.error)
      errored += 1
      continue
    }
    if (owed.value > 0) due.push({ clientId, amountOwed: owed.value })
  }

  return ok({ due, errored })
}
