'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { queueInactiveReminders } from '@/features/notifications/application/inactive-clients'
import { inactiveClientsRepository } from '@/features/notifications/db/inactive-clients-repository'
import { INACTIVE_CLIENTS_PATH } from '../constants/inactive-clients-strings'
import { performQueueInactiveReminders } from '../utils/perform-queue'
import type { QueueActionState } from '../types/inactive-send.types'

export async function queueInactiveRemindersAction(_previous: QueueActionState, formData: FormData): Promise<QueueActionState> {
  await requireAdminSession()
  const state = await performQueueInactiveReminders(
    queueInactiveReminders(inactiveClientsRepository(await createClient())),
    formData,
  )
  if (state.status === 'success') revalidatePath(INACTIVE_CLIENTS_PATH)
  return state
}
