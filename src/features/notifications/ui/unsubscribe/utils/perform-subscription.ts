import { isErr } from '@/shared/result'
import { isUnsubscribeToken } from '@/features/notifications/domain/inactive-reminder-message'
import type { InactiveSubscriptionRepository } from '@/features/notifications/application/ports'
import { UNSUBSCRIBE_FIELDS, UNSUBSCRIBE_INTENTS } from '../constants/unsubscribe-strings'
import type { SubscriptionState } from '../types/unsubscribe.types'

export async function performSubscriptionChange(
  repository: InactiveSubscriptionRepository,
  formData: FormData,
): Promise<SubscriptionState> {
  const token = formData.get(UNSUBSCRIBE_FIELDS.token)
  const intent = formData.get(UNSUBSCRIBE_FIELDS.intent)
  if (typeof token !== 'string' || !isUnsubscribeToken(token)) return { status: 'invalid' }

  if (intent === UNSUBSCRIBE_INTENTS.unsubscribe) {
    const result = await repository.unsubscribe(token)
    return isErr(result) ? { status: 'error' } : { status: 'unsubscribed' }
  }
  if (intent === UNSUBSCRIBE_INTENTS.resubscribe) {
    const result = await repository.resubscribe(token)
    return isErr(result) ? { status: 'error' } : { status: 'subscribed' }
  }
  return { status: 'invalid' }
}
