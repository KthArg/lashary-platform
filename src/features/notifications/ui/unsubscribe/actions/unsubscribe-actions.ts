'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { inactiveSubscriptionRepository } from '@/features/notifications/db/inactive-subscription-repository'
import { performSubscriptionChange } from '../utils/perform-subscription'
import type { SubscriptionState } from '../types/unsubscribe.types'

export async function changeSubscriptionAction(_previous: SubscriptionState, formData: FormData): Promise<SubscriptionState> {
  return performSubscriptionChange(inactiveSubscriptionRepository(await createClient()), formData)
}
